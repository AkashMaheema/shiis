-- ============================================================
-- Migration V5: Drop Appointment.doctor_name
-- Run this against HealthcareInventoryDB
-- ============================================================

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('Appointment')
    AND name = 'doctor_name'
)
BEGIN
  DECLARE @df_name NVARCHAR(128);

  SELECT @df_name = dc.name
  FROM sys.default_constraints dc
  INNER JOIN sys.columns c
    ON c.object_id = dc.parent_object_id
   AND c.column_id = dc.parent_column_id
  WHERE dc.parent_object_id = OBJECT_ID('Appointment')
    AND c.name = 'doctor_name';

  IF @df_name IS NOT NULL
  BEGIN
    DECLARE @sql NVARCHAR(400);
    SET @sql = N'ALTER TABLE Appointment DROP CONSTRAINT [' + REPLACE(@df_name, ']', ']]') + N']';
    EXEC(@sql);
    PRINT 'Dropped default constraint on Appointment.doctor_name';
  END

  ALTER TABLE Appointment DROP COLUMN doctor_name;
  PRINT 'Dropped column: Appointment.doctor_name';
END
