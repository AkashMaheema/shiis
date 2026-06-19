-- ============================================================
-- Migration V10: Billing module enhancements
-- Keeps existing Bill, Bill_Item, and Payment data intact.
-- ============================================================

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Bill') AND name = 'status'
)
BEGIN
  ALTER TABLE Bill ADD status VARCHAR(20) NOT NULL CONSTRAINT DF_Bill_Status DEFAULT 'Unpaid';
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Bill') AND name = 'notes'
)
BEGIN
  ALTER TABLE Bill ADD notes VARCHAR(500) NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Bill') AND name = 'is_deleted'
)
BEGIN
  ALTER TABLE Bill ADD is_deleted BIT NOT NULL CONSTRAINT DF_Bill_IsDeleted DEFAULT 0;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Bill') AND name = 'deleted_at'
)
BEGIN
  ALTER TABLE Bill ADD deleted_at DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Bill') AND name = 'deleted_by'
)
BEGIN
  ALTER TABLE Bill ADD deleted_by INT NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Bill') AND name = 'created_at'
)
BEGIN
  ALTER TABLE Bill ADD created_at DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Bill') AND name = 'updated_at'
)
BEGIN
  ALTER TABLE Bill ADD updated_at DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Bill') AND name = 'created_by'
)
BEGIN
  ALTER TABLE Bill ADD created_by INT NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Bill') AND name = 'updated_by'
)
BEGIN
  ALTER TABLE Bill ADD updated_by INT NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Bill_Item') AND name = 'quantity'
)
BEGIN
  ALTER TABLE Bill_Item ADD quantity INT NOT NULL CONSTRAINT DF_BillItem_Quantity DEFAULT 1;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Bill_Item') AND name = 'unit_price'
)
BEGIN
  ALTER TABLE Bill_Item ADD unit_price DECIMAL(10,2) NULL;
END
GO

UPDATE Bill_Item
SET unit_price = amount
WHERE unit_price IS NULL;
GO

UPDATE b
SET
  status = CASE
    WHEN COALESCE(p.paid_amount, 0) >= COALESCE(b.total_amount, 0)
      AND COALESCE(b.total_amount, 0) > 0 THEN 'Paid'
    WHEN COALESCE(p.paid_amount, 0) > 0 THEN 'Partially Paid'
    ELSE 'Unpaid'
  END,
  created_at = COALESCE(b.created_at, b.created_date, GETDATE()),
  updated_at = COALESCE(b.updated_at, b.created_date, GETDATE())
FROM Bill b
OUTER APPLY (
  SELECT SUM(amount) AS paid_amount
  FROM Payment p
  WHERE p.bill_id = b.bill_id
) p;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('Bill') AND name = 'IX_Bill_Status_Date'
)
BEGIN
  CREATE INDEX IX_Bill_Status_Date ON Bill (is_deleted, status, created_date DESC);
END
GO

IF OBJECT_ID('sp_GenerateBill', 'P') IS NOT NULL
  DROP PROCEDURE sp_GenerateBill;
GO

CREATE PROCEDURE sp_GenerateBill
  @appointment_id INT,
  @created_by INT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @patient_id INT;
  DECLARE @bill_id INT;

  SELECT @patient_id = patient_id
  FROM Appointment
  WHERE appointment_id = @appointment_id
    AND ISNULL(is_deleted, 0) = 0;

  IF @patient_id IS NULL
    THROW 51000, 'Appointment not found.', 1;

  IF EXISTS (
    SELECT 1 FROM Bill
    WHERE appointment_id = @appointment_id
      AND ISNULL(is_deleted, 0) = 0
  )
  BEGIN
    SELECT TOP 1 bill_id AS billId
    FROM Bill
    WHERE appointment_id = @appointment_id
      AND ISNULL(is_deleted, 0) = 0
    ORDER BY bill_id DESC;
    RETURN;
  END

  BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO Bill (
      patient_id,
      appointment_id,
      total_amount,
      created_date,
      status,
      is_deleted,
      created_at,
      updated_at,
      created_by,
      updated_by
    )
    VALUES (
      @patient_id,
      @appointment_id,
      0,
      GETDATE(),
      'Unpaid',
      0,
      GETDATE(),
      GETDATE(),
      @created_by,
      @created_by
    );

    SET @bill_id = SCOPE_IDENTITY();

    INSERT INTO Bill_Item (bill_id, description, quantity, unit_price, amount)
    VALUES (@bill_id, 'Consultation Fee', 1, 1000, 1000);

    INSERT INTO Bill_Item (bill_id, description, quantity, unit_price, amount)
    SELECT
      @bill_id,
      m.name,
      COALESCE(pi.quantity, 1),
      COALESCE(m.unit_price, 0),
      COALESCE(pi.quantity, 1) * COALESCE(m.unit_price, 0)
    FROM Prescription p
    INNER JOIN Prescription_Item pi
      ON p.prescription_id = pi.prescription_id
    INNER JOIN Medicine m
      ON pi.medicine_id = m.medicine_id
    WHERE p.appointment_id = @appointment_id;

    UPDATE Bill
    SET total_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM Bill_Item
      WHERE bill_id = @bill_id
    )
    WHERE bill_id = @bill_id;

    COMMIT TRANSACTION;

    SELECT @bill_id AS billId;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

IF OBJECT_ID('sp_ProcessPayment', 'P') IS NOT NULL
  DROP PROCEDURE sp_ProcessPayment;
GO

CREATE PROCEDURE sp_ProcessPayment
  @bill_id INT,
  @payment_method VARCHAR(50),
  @amount DECIMAL(10,2),
  @created_by INT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @total DECIMAL(10,2);
  DECLARE @paid DECIMAL(10,2);

  SELECT @total = total_amount
  FROM Bill
  WHERE bill_id = @bill_id
    AND ISNULL(is_deleted, 0) = 0;

  IF @total IS NULL
    THROW 51001, 'Bill not found.', 1;

  BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO Payment (bill_id, payment_method, amount, payment_date)
    VALUES (@bill_id, @payment_method, @amount, GETDATE());

    SELECT @paid = COALESCE(SUM(amount), 0)
    FROM Payment
    WHERE bill_id = @bill_id;

    UPDATE Bill
    SET
      status = CASE
        WHEN @paid >= COALESCE(total_amount, 0) AND COALESCE(total_amount, 0) > 0 THEN 'Paid'
        WHEN @paid > 0 THEN 'Partially Paid'
        ELSE 'Unpaid'
      END,
      updated_at = GETDATE(),
      updated_by = @created_by
    WHERE bill_id = @bill_id;

    INSERT INTO Audit_Log (user_id, action, timestamp)
    VALUES (
      @created_by,
      CONCAT('Payment processed for bill ID ', @bill_id),
      GETDATE()
    );

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

IF OBJECT_ID('sp_GetBillSummary', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetBillSummary;
GO

CREATE PROCEDURE sp_GetBillSummary
  @bill_id INT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    b.bill_id AS billId,
    b.patient_id AS patientId,
    CONCAT(p.first_name, ' ', p.last_name) AS patientName,
    b.appointment_id AS appointmentId,
    b.total_amount AS totalAmount,
    COALESCE(pay.paidAmount, 0) AS paidAmount,
    COALESCE(b.total_amount, 0) - COALESCE(pay.paidAmount, 0) AS balanceAmount,
    b.status,
    b.created_date AS createdDate
  FROM Bill b
  LEFT JOIN Patient p ON p.patient_id = b.patient_id
  OUTER APPLY (
    SELECT SUM(amount) AS paidAmount
    FROM Payment
    WHERE bill_id = b.bill_id
  ) pay
  WHERE b.bill_id = @bill_id;
END;
GO

IF OBJECT_ID('sp_GetBillingStats', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetBillingStats;
GO

CREATE PROCEDURE sp_GetBillingStats
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    COUNT(*) AS totalBills,
    SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) AS paidBills,
    SUM(CASE WHEN status = 'Partially Paid' THEN 1 ELSE 0 END) AS partialBills,
    SUM(CASE WHEN status = 'Unpaid' THEN 1 ELSE 0 END) AS unpaidBills,
    COALESCE(SUM(total_amount), 0) AS totalBilled,
    COALESCE((
      SELECT SUM(amount) FROM Payment
    ), 0) AS totalCollected
  FROM Bill
  WHERE ISNULL(is_deleted, 0) = 0;
END;
GO
