-- Migration V15: Simple system support stored procedures
-- Purpose: small practical procedures used by operational screens and reports.

IF OBJECT_ID('sp_GetDoctorSchedule', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetDoctorSchedule;
GO

CREATE PROCEDURE sp_GetDoctorSchedule
  @doctorId INT,
  @scheduleDate DATE
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    a.appointment_id AS appointmentId,
    a.appointment_date AS appointmentDate,
    a.appointment_time AS appointmentTime,
    a.status,
    a.reason,
    a.consultation_fee AS consultationFee,
    p.patient_id AS patientId,
    CONCAT(p.first_name, ' ', p.last_name) AS patientName,
    p.phone AS patientPhone
  FROM Appointment a
  INNER JOIN Patient p ON p.patient_id = a.patient_id
  WHERE a.is_deleted = 0
    AND p.is_deleted = 0
    AND a.doctor_id = @doctorId
    AND CAST(a.appointment_date AS DATE) = @scheduleDate
  ORDER BY a.appointment_time ASC, a.appointment_id ASC;
END;
GO

IF OBJECT_ID('sp_GetPatientVisitHistory', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetPatientVisitHistory;
GO

CREATE PROCEDURE sp_GetPatientVisitHistory
  @patientId INT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    a.appointment_id AS appointmentId,
    a.appointment_date AS appointmentDate,
    a.appointment_time AS appointmentTime,
    a.status AS appointmentStatus,
    a.reason,
    CONCAT(d.first_name, ' ', d.last_name) AS doctorName,
    d.specialization,
    pr.prescription_id AS prescriptionId,
    lr.labRequestCount,
    b.bill_id AS billId,
    b.total_amount AS billTotal,
    ISNULL(pay.paidAmount, 0) AS paidAmount,
    ISNULL(b.total_amount, 0) - ISNULL(pay.paidAmount, 0) AS outstandingAmount
  FROM Appointment a
  LEFT JOIN Doctor d ON d.doctor_id = a.doctor_id
  LEFT JOIN Prescription pr ON pr.appointment_id = a.appointment_id AND pr.is_deleted = 0
  OUTER APPLY (
    SELECT COUNT(*) AS labRequestCount
    FROM Lab_Request
    WHERE patient_id = a.patient_id
      AND doctor_id = a.doctor_id
  ) lr
  LEFT JOIN Bill b ON b.appointment_id = a.appointment_id AND b.is_deleted = 0
  OUTER APPLY (
    SELECT SUM(ISNULL(amount, 0)) AS paidAmount
    FROM Payment
    WHERE bill_id = b.bill_id
  ) pay
  WHERE a.is_deleted = 0
    AND a.patient_id = @patientId
  ORDER BY a.appointment_date DESC, a.appointment_id DESC;
END;
GO

IF OBJECT_ID('sp_GetLowStockMedicines', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetLowStockMedicines;
GO

CREATE PROCEDURE sp_GetLowStockMedicines
  @threshold INT = 10
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    m.medicine_id AS medicineId,
    m.name,
    m.category,
    m.unit_price AS unitPrice,
    ISNULL(s.total_quantity, 0) AS totalQuantity,
    @threshold AS threshold,
    CASE WHEN ISNULL(s.total_quantity, 0) = 0 THEN 'OUT_OF_STOCK' ELSE 'LOW_STOCK' END AS stockStatus
  FROM Medicine m
  LEFT JOIN Stock s ON s.medicine_id = m.medicine_id
  WHERE ISNULL(s.total_quantity, 0) <= @threshold
  ORDER BY ISNULL(s.total_quantity, 0) ASC, m.name ASC;
END;
GO

IF OBJECT_ID('sp_GetExpiringMedicineBatches', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetExpiringMedicineBatches;
GO

CREATE PROCEDURE sp_GetExpiringMedicineBatches
  @days INT = 30
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    mb.batch_id AS batchId,
    mb.medicine_id AS medicineId,
    m.name AS medicineName,
    mb.batch_no AS batchNo,
    mb.expiry_date AS expiryDate,
    mb.quantity,
    DATEDIFF(DAY, CAST(GETDATE() AS DATE), mb.expiry_date) AS daysToExpiry
  FROM Medicine_Batch mb
  INNER JOIN Medicine m ON m.medicine_id = mb.medicine_id
  WHERE mb.expiry_date IS NOT NULL
    AND mb.expiry_date BETWEEN CAST(GETDATE() AS DATE)
        AND DATEADD(DAY, @days, CAST(GETDATE() AS DATE))
  ORDER BY mb.expiry_date ASC, m.name ASC;
END;
GO

IF OBJECT_ID('sp_GetPendingLabRequests', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetPendingLabRequests;
GO

CREATE PROCEDURE sp_GetPendingLabRequests
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    lr.request_id AS requestId,
    lr.request_date AS requestDate,
    lt.test_id AS testId,
    lt.test_name AS testName,
    p.patient_id AS patientId,
    CONCAT(p.first_name, ' ', p.last_name) AS patientName,
    d.doctor_id AS doctorId,
    CONCAT(d.first_name, ' ', d.last_name) AS doctorName
  FROM Lab_Request lr
  INNER JOIN Lab_Test lt ON lt.test_id = lr.test_id
  INNER JOIN Patient p ON p.patient_id = lr.patient_id
  INNER JOIN Doctor d ON d.doctor_id = lr.doctor_id
  LEFT JOIN Lab_Result res ON res.request_id = lr.request_id
  WHERE res.result_id IS NULL
  ORDER BY lr.request_date ASC, lr.request_id ASC;
END;
GO

IF OBJECT_ID('sp_GetUnpaidBills', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetUnpaidBills;
GO

CREATE PROCEDURE sp_GetUnpaidBills
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    b.bill_id AS billId,
    b.created_date AS createdDate,
    b.patient_id AS patientId,
    CONCAT(p.first_name, ' ', p.last_name) AS patientName,
    p.phone,
    b.total_amount AS totalAmount,
    ISNULL(pay.paidAmount, 0) AS paidAmount,
    ISNULL(b.total_amount, 0) - ISNULL(pay.paidAmount, 0) AS balanceAmount,
    b.status
  FROM Bill b
  INNER JOIN Patient p ON p.patient_id = b.patient_id
  OUTER APPLY (
    SELECT SUM(ISNULL(amount, 0)) AS paidAmount
    FROM Payment
    WHERE bill_id = b.bill_id
  ) pay
  WHERE b.is_deleted = 0
    AND ISNULL(b.total_amount, 0) > ISNULL(pay.paidAmount, 0)
  ORDER BY balanceAmount DESC, b.created_date ASC;
END;
GO

IF OBJECT_ID('sp_GetDailyAppointmentsSummary', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetDailyAppointmentsSummary;
GO

CREATE PROCEDURE sp_GetDailyAppointmentsSummary
  @summaryDate DATE
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    @summaryDate AS summaryDate,
    COUNT(*) AS totalAppointments,
    SUM(CASE WHEN LOWER(ISNULL(status, '')) = 'scheduled' THEN 1 ELSE 0 END) AS scheduledCount,
    SUM(CASE WHEN LOWER(ISNULL(status, '')) = 'completed' THEN 1 ELSE 0 END) AS completedCount,
    SUM(CASE WHEN LOWER(ISNULL(status, '')) IN ('cancelled', 'canceled') THEN 1 ELSE 0 END) AS cancelledCount,
    COUNT(DISTINCT doctor_id) AS activeDoctors,
    COUNT(DISTINCT patient_id) AS uniquePatients
  FROM Appointment
  WHERE is_deleted = 0
    AND CAST(appointment_date AS DATE) = @summaryDate;
END;
GO

IF OBJECT_ID('sp_GetDoctorWorkloadSummary', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetDoctorWorkloadSummary;
GO

CREATE PROCEDURE sp_GetDoctorWorkloadSummary
  @fromDate DATE = NULL,
  @toDate DATE = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @startDate DATE = ISNULL(@fromDate, DATEADD(DAY, -30, CAST(GETDATE() AS DATE)));
  DECLARE @endDate DATE = ISNULL(@toDate, CAST(GETDATE() AS DATE));

  SELECT
    d.doctor_id AS doctorId,
    CONCAT(d.first_name, ' ', d.last_name) AS doctorName,
    d.specialization,
    COUNT(a.appointment_id) AS appointmentCount,
    SUM(CASE WHEN LOWER(ISNULL(a.status, '')) = 'completed' THEN 1 ELSE 0 END) AS completedCount,
    SUM(CASE WHEN LOWER(ISNULL(a.status, '')) = 'scheduled' THEN 1 ELSE 0 END) AS scheduledCount,
    COUNT(DISTINCT a.patient_id) AS uniquePatientCount
  FROM Doctor d
  LEFT JOIN Appointment a
    ON a.doctor_id = d.doctor_id
   AND a.is_deleted = 0
   AND CAST(a.appointment_date AS DATE) BETWEEN @startDate AND @endDate
  WHERE d.is_deleted = 0
  GROUP BY d.doctor_id, d.first_name, d.last_name, d.specialization
  ORDER BY appointmentCount DESC, doctorName ASC;
END;
GO

IF OBJECT_ID('sp_GetMedicineMovementHistory', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetMedicineMovementHistory;
GO

CREATE PROCEDURE sp_GetMedicineMovementHistory
  @medicineId INT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    il.log_id AS logId,
    il.medicine_id AS medicineId,
    m.name AS medicineName,
    il.change_type AS changeType,
    il.quantity,
    il.[date]
  FROM Inventory_Log il
  INNER JOIN Medicine m ON m.medicine_id = il.medicine_id
  WHERE il.medicine_id = @medicineId
  ORDER BY il.[date] DESC, il.log_id DESC;
END;
GO

IF OBJECT_ID('sp_SearchPatients', 'P') IS NOT NULL
  DROP PROCEDURE sp_SearchPatients;
GO

CREATE PROCEDURE sp_SearchPatients
  @searchTerm NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 50
    patient_id AS patientId,
    first_name AS firstName,
    last_name AS lastName,
    dob,
    gender,
    phone,
    email,
    address
  FROM Patient
  WHERE is_deleted = 0
    AND (
      first_name LIKE '%' + @searchTerm + '%'
      OR last_name LIKE '%' + @searchTerm + '%'
      OR phone LIKE '%' + @searchTerm + '%'
      OR email LIKE '%' + @searchTerm + '%'
    )
  ORDER BY first_name ASC, last_name ASC;
END;
GO
