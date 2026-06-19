-- ============================================================
-- Migration V11: Prescription management and billing sync
-- ============================================================

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Prescription') AND name = 'notes'
)
BEGIN
  ALTER TABLE Prescription ADD notes VARCHAR(500) NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Prescription') AND name = 'is_deleted'
)
BEGIN
  ALTER TABLE Prescription ADD is_deleted BIT NOT NULL CONSTRAINT DF_Prescription_IsDeleted DEFAULT 0;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Prescription') AND name = 'deleted_at'
)
BEGIN
  ALTER TABLE Prescription ADD deleted_at DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Prescription') AND name = 'deleted_by'
)
BEGIN
  ALTER TABLE Prescription ADD deleted_by INT NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Prescription') AND name = 'created_at'
)
BEGIN
  ALTER TABLE Prescription ADD created_at DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Prescription') AND name = 'updated_at'
)
BEGIN
  ALTER TABLE Prescription ADD updated_at DATETIME NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Prescription') AND name = 'created_by'
)
BEGIN
  ALTER TABLE Prescription ADD created_by INT NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Prescription') AND name = 'updated_by'
)
BEGIN
  ALTER TABLE Prescription ADD updated_by INT NULL;
END
GO

UPDATE Prescription
SET
  created_at = COALESCE(created_at, issued_date, GETDATE()),
  updated_at = COALESCE(updated_at, issued_date, GETDATE())
WHERE created_at IS NULL OR updated_at IS NULL;
GO

DECLARE @constraintName SYSNAME;

SELECT @constraintName = kc.name
FROM sys.key_constraints kc
JOIN sys.index_columns ic
  ON ic.object_id = kc.parent_object_id
 AND ic.index_id = kc.unique_index_id
JOIN sys.columns c
  ON c.object_id = ic.object_id
 AND c.column_id = ic.column_id
WHERE kc.parent_object_id = OBJECT_ID('Prescription')
  AND kc.type = 'UQ'
  AND c.name = 'appointment_id';

IF @constraintName IS NOT NULL
BEGIN
  DECLARE @sql NVARCHAR(MAX);
  SET @sql = N'ALTER TABLE Prescription DROP CONSTRAINT ' + QUOTENAME(@constraintName);
  EXEC sp_executesql @sql;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('Prescription') AND name = 'IX_Prescription_Appointment'
)
BEGIN
  CREATE INDEX IX_Prescription_Appointment
    ON Prescription (appointment_id, is_deleted, issued_date DESC);
END
GO

IF OBJECT_ID('sp_SyncPrescriptionBillItems', 'P') IS NOT NULL
  DROP PROCEDURE sp_SyncPrescriptionBillItems;
GO

CREATE PROCEDURE sp_SyncPrescriptionBillItems
  @appointment_id INT
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @bill_id INT;

  SELECT TOP 1 @bill_id = bill_id
  FROM Bill
  WHERE appointment_id = @appointment_id
    AND ISNULL(is_deleted, 0) = 0
  ORDER BY bill_id DESC;

  IF @bill_id IS NULL
    RETURN;

  BEGIN TRY
    BEGIN TRANSACTION;

    DELETE FROM Bill_Item
    WHERE bill_id = @bill_id
      AND description LIKE 'Prescription:%';

    INSERT INTO Bill_Item (bill_id, description, quantity, unit_price, amount)
    SELECT
      @bill_id,
      CONCAT('Prescription: ', m.name),
      COALESCE(pi.quantity, 1),
      COALESCE(m.unit_price, 0),
      COALESCE(pi.quantity, 1) * COALESCE(m.unit_price, 0)
    FROM Prescription rx
    INNER JOIN Prescription_Item pi
      ON pi.prescription_id = rx.prescription_id
    INNER JOIN Medicine m
      ON m.medicine_id = pi.medicine_id
    WHERE rx.appointment_id = @appointment_id
      AND ISNULL(rx.is_deleted, 0) = 0;

    UPDATE Bill
    SET
      total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM Bill_Item
        WHERE bill_id = @bill_id
      ),
      status = CASE
        WHEN COALESCE(pay.paid_amount, 0) >= (
          SELECT COALESCE(SUM(amount), 0) FROM Bill_Item WHERE bill_id = @bill_id
        )
          AND (SELECT COALESCE(SUM(amount), 0) FROM Bill_Item WHERE bill_id = @bill_id) > 0
        THEN 'Paid'
        WHEN COALESCE(pay.paid_amount, 0) > 0 THEN 'Partially Paid'
        ELSE 'Unpaid'
      END,
      updated_at = GETDATE()
    FROM Bill b
    OUTER APPLY (
      SELECT SUM(amount) AS paid_amount
      FROM Payment
      WHERE bill_id = @bill_id
    ) pay
    WHERE b.bill_id = @bill_id;

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

IF OBJECT_ID('sp_SavePrescriptionDetails', 'P') IS NOT NULL
  DROP PROCEDURE sp_SavePrescriptionDetails;
GO

CREATE PROCEDURE sp_SavePrescriptionDetails
  @appointment_id INT,
  @items_json NVARCHAR(MAX),
  @notes VARCHAR(500) = NULL,
  @created_by INT = NULL,
  @prescription_id INT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1 FROM Appointment
    WHERE appointment_id = @appointment_id
      AND ISNULL(is_deleted, 0) = 0
  )
    THROW 51010, 'Appointment not found.', 1;

  BEGIN TRY
    BEGIN TRANSACTION;

    IF @prescription_id IS NULL
    BEGIN
      INSERT INTO Prescription (
        appointment_id,
        issued_date,
        notes,
        is_deleted,
        created_at,
        updated_at,
        created_by,
        updated_by
      )
      VALUES (
        @appointment_id,
        GETDATE(),
        @notes,
        0,
        GETDATE(),
        GETDATE(),
        @created_by,
        @created_by
      );

      SET @prescription_id = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
      UPDATE Prescription
      SET
        appointment_id = @appointment_id,
        notes = @notes,
        is_deleted = 0,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = GETDATE(),
        updated_by = @created_by
      WHERE prescription_id = @prescription_id;

      DELETE FROM Prescription_Item
      WHERE prescription_id = @prescription_id;
    END

    INSERT INTO Prescription_Item (
      prescription_id,
      medicine_id,
      dosage,
      quantity
    )
    SELECT
      @prescription_id,
      medicineId,
      dosage,
      quantity
    FROM OPENJSON(@items_json)
    WITH (
      medicineId INT '$.medicineId',
      dosage VARCHAR(100) '$.dosage',
      quantity INT '$.quantity'
    );

    UPDATE Appointment
    SET status = 'Completed'
    WHERE appointment_id = @appointment_id;

    COMMIT TRANSACTION;

    EXEC sp_SyncPrescriptionBillItems @appointment_id;

    SELECT @prescription_id AS prescriptionId;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

IF OBJECT_ID('sp_SavePrescription', 'P') IS NOT NULL
  DROP PROCEDURE sp_SavePrescription;
GO

CREATE PROCEDURE sp_SavePrescription
  @appointment_id INT
AS
BEGIN
  SET NOCOUNT ON;

  EXEC sp_SavePrescriptionDetails
    @appointment_id = @appointment_id,
    @items_json = N'[]',
    @notes = NULL,
    @created_by = NULL,
    @prescription_id = NULL;
END;
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
    EXEC sp_SyncPrescriptionBillItems @appointment_id;

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
      CONCAT('Prescription: ', m.name),
      COALESCE(pi.quantity, 1),
      COALESCE(m.unit_price, 0),
      COALESCE(pi.quantity, 1) * COALESCE(m.unit_price, 0)
    FROM Prescription rx
    INNER JOIN Prescription_Item pi
      ON rx.prescription_id = pi.prescription_id
    INNER JOIN Medicine m
      ON pi.medicine_id = m.medicine_id
    WHERE rx.appointment_id = @appointment_id
      AND ISNULL(rx.is_deleted, 0) = 0;

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
