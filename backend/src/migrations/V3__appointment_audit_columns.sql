-- ============================================================
-- Migration V3: Appointment Audit Columns
-- Run this against HealthcareInventoryDB
-- ============================================================

-- Add missing soft-delete and audit columns expected by Appointment entity
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'is_deleted'
)
BEGIN
  ALTER TABLE Appointment ADD is_deleted BIT NOT NULL DEFAULT 0;
  PRINT 'Added column: Appointment.is_deleted';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'deleted_at'
)
BEGIN
  ALTER TABLE Appointment ADD deleted_at DATETIME NULL;
  PRINT 'Added column: Appointment.deleted_at';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'deleted_by'
)
BEGIN
  ALTER TABLE Appointment ADD deleted_by INT NULL;
  PRINT 'Added column: Appointment.deleted_by';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'created_at'
)
BEGIN
  ALTER TABLE Appointment ADD created_at DATETIME NULL;
  PRINT 'Added column: Appointment.created_at';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'updated_at'
)
BEGIN
  ALTER TABLE Appointment ADD updated_at DATETIME NULL;
  PRINT 'Added column: Appointment.updated_at';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'created_by'
)
BEGIN
  ALTER TABLE Appointment ADD created_by INT NULL;
  PRINT 'Added column: Appointment.created_by';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'updated_by'
)
BEGIN
  ALTER TABLE Appointment ADD updated_by INT NULL;
  PRINT 'Added column: Appointment.updated_by';
END

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('Appointment') AND name = 'IX_Appointment_IsDeleted'
)
BEGIN
  CREATE INDEX IX_Appointment_IsDeleted ON Appointment (is_deleted, created_at DESC);
  PRINT 'Created index: IX_Appointment_IsDeleted';
END
