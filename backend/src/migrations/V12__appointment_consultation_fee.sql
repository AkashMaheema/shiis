-- ============================================================
-- Migration V12: Appointment consultation fee
-- ============================================================

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'consultation_fee'
)
BEGIN
  ALTER TABLE Appointment
    ADD consultation_fee DECIMAL(10,2) NOT NULL
      CONSTRAINT DF_Appointment_ConsultationFee DEFAULT 1000;
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
  DECLARE @consultation_fee DECIMAL(10,2);

  SELECT
    @patient_id = patient_id,
    @consultation_fee = COALESCE(consultation_fee, 1000)
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
    VALUES (
      @bill_id,
      'Consultation Fee',
      1,
      @consultation_fee,
      @consultation_fee
    );

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
