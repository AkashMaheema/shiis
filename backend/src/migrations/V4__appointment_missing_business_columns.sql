-- ============================================================
-- Migration V4: Appointment Missing Business Columns
-- Run this against HealthcareInventoryDB
-- ============================================================

-- Ensure Appointment table has all business columns expected by the entity.
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'patient_id'
)
BEGIN
  ALTER TABLE Appointment ADD patient_id INT NULL;
  PRINT 'Added column: Appointment.patient_id';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'doctor_name'
)
BEGIN
  ALTER TABLE Appointment ADD doctor_name VARCHAR(100) NULL;
  PRINT 'Added column: Appointment.doctor_name';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'appointment_date'
)
BEGIN
  ALTER TABLE Appointment ADD appointment_date DATETIME NULL;
  PRINT 'Added column: Appointment.appointment_date';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'appointment_time'
)
BEGIN
  ALTER TABLE Appointment ADD appointment_time VARCHAR(10) NULL;
  PRINT 'Added column: Appointment.appointment_time';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'status'
)
BEGIN
  ALTER TABLE Appointment ADD status VARCHAR(20) NOT NULL DEFAULT 'Scheduled';
  PRINT 'Added column: Appointment.status';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'reason'
)
BEGIN
  ALTER TABLE Appointment ADD reason VARCHAR(255) NULL;
  PRINT 'Added column: Appointment.reason';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'notes'
)
BEGIN
  ALTER TABLE Appointment ADD notes NVARCHAR(MAX) NULL;
  PRINT 'Added column: Appointment.notes';
END
