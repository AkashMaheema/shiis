-- ============================================================
-- Migration V7: Backfill Appointment audit values
-- Run this against HealthcareInventoryDB
-- ============================================================

IF OBJECT_ID('Appointment', 'U') IS NOT NULL
BEGIN
  -- Backfill created_at from updated_at, then appointment_date, then current time
  IF COL_LENGTH('Appointment', 'created_at') IS NOT NULL
  BEGIN
    UPDATE Appointment
    SET created_at = ISNULL(updated_at, ISNULL(appointment_date, GETDATE()))
    WHERE created_at IS NULL;
    PRINT 'Backfilled Appointment.created_at';
  END

  -- Backfill updated_at from created_at, then appointment_date, then current time
  IF COL_LENGTH('Appointment', 'updated_at') IS NOT NULL
  BEGIN
    UPDATE Appointment
    SET updated_at = ISNULL(created_at, ISNULL(appointment_date, GETDATE()))
    WHERE updated_at IS NULL;
    PRINT 'Backfilled Appointment.updated_at';
  END

  -- Backfill created_by from updated_by when possible
  IF COL_LENGTH('Appointment', 'created_by') IS NOT NULL
     AND COL_LENGTH('Appointment', 'updated_by') IS NOT NULL
  BEGIN
    UPDATE Appointment
    SET created_by = updated_by
    WHERE created_by IS NULL
      AND updated_by IS NOT NULL;
    PRINT 'Backfilled Appointment.created_by from updated_by';
  END
END
