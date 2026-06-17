-- ============================================================
-- Migration V6: Align Appointment.status CHECK constraint
-- Run this against HealthcareInventoryDB
-- ============================================================

IF COL_LENGTH('Appointment', 'status') IS NOT NULL
BEGIN
  -- 1) Drop existing CHECK constraints bound to Appointment.status
  DECLARE @dropSql NVARCHAR(MAX) = N'';

  SELECT @dropSql = @dropSql +
    N'ALTER TABLE Appointment DROP CONSTRAINT [' + cc.name + N'];'
  FROM sys.check_constraints cc
  INNER JOIN sys.columns c
    ON c.object_id = cc.parent_object_id
   AND c.column_id = cc.parent_column_id
  WHERE cc.parent_object_id = OBJECT_ID('Appointment')
    AND c.name = 'status';

  IF LEN(@dropSql) > 0
  BEGIN
    EXEC sp_executesql @dropSql;
    PRINT 'Dropped existing CHECK constraint(s) on Appointment.status';
  END

  -- 2) Normalize legacy/invalid status values before adding a strict constraint
  UPDATE Appointment
  SET status = 'Scheduled'
  WHERE status IS NULL
     OR LTRIM(RTRIM(status)) = ''
     OR status NOT IN ('Scheduled', 'Booked', 'Completed', 'Cancelled', 'No Show');

  PRINT 'Normalized invalid Appointment.status values to Scheduled';

  -- 3) Recreate aligned CHECK constraint
  ALTER TABLE Appointment
  ADD CONSTRAINT CK_Appointment_Status
  CHECK (status IN ('Scheduled', 'Booked', 'Completed', 'Cancelled', 'No Show'));

  PRINT 'Created CHECK constraint: CK_Appointment_Status';
END
