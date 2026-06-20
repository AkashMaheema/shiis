-- Migration V14: Advanced reporting stored procedures
-- These procedures support the university Advanced DB Management requirement by
-- moving multi-table reporting and risk calculations into SQL Server.

IF OBJECT_ID('sp_GetClinicalOperationsSummary', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetClinicalOperationsSummary;
GO

CREATE PROCEDURE sp_GetClinicalOperationsSummary
  @fromDate DATE = NULL,
  @toDate DATE = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @startDate DATE = ISNULL(@fromDate, DATEADD(DAY, -30, CAST(GETDATE() AS DATE)));
  DECLARE @endDate DATE = ISNULL(@toDate, CAST(GETDATE() AS DATE));

  ;WITH appointment_scope AS (
    SELECT
      appointment_id,
      patient_id,
      doctor_id,
      status,
      appointment_date
    FROM Appointment
    WHERE is_deleted = 0
      AND CAST(appointment_date AS DATE) BETWEEN @startDate AND @endDate
  ),
  prescription_scope AS (
    SELECT
      appointment_id,
      COUNT(*) AS prescription_count
    FROM Prescription
    WHERE is_deleted = 0
    GROUP BY appointment_id
  ),
  bill_scope AS (
    SELECT
      b.appointment_id,
      COUNT(*) AS bill_count,
      SUM(ISNULL(b.total_amount, 0)) AS billed_amount,
      SUM(ISNULL(p.paid_amount, 0)) AS paid_amount
    FROM Bill b
    OUTER APPLY (
      SELECT SUM(ISNULL(amount, 0)) AS paid_amount
      FROM Payment
      WHERE bill_id = b.bill_id
    ) p
    WHERE b.is_deleted = 0
    GROUP BY b.appointment_id
  )
  SELECT
    d.doctor_id AS doctorId,
    CONCAT(d.first_name, ' ', d.last_name) AS doctorName,
    d.specialization,
    @startDate AS fromDate,
    @endDate AS toDate,
    COUNT(a.appointment_id) AS totalAppointments,
    SUM(CASE WHEN LOWER(ISNULL(a.status, '')) = 'completed' THEN 1 ELSE 0 END) AS completedAppointments,
    SUM(CASE WHEN LOWER(ISNULL(a.status, '')) = 'scheduled' THEN 1 ELSE 0 END) AS scheduledAppointments,
    SUM(CASE WHEN LOWER(ISNULL(a.status, '')) IN ('cancelled', 'canceled') THEN 1 ELSE 0 END) AS cancelledAppointments,
    COUNT(DISTINCT a.patient_id) AS uniquePatients,
    ISNULL(SUM(ps.prescription_count), 0) AS prescriptionsIssued,
    ISNULL(SUM(bs.bill_count), 0) AS billsGenerated,
    CAST(ISNULL(SUM(bs.billed_amount), 0) AS DECIMAL(12, 2)) AS billedAmount,
    CAST(ISNULL(SUM(bs.paid_amount), 0) AS DECIMAL(12, 2)) AS paidAmount,
    CAST(ISNULL(SUM(bs.billed_amount - bs.paid_amount), 0) AS DECIMAL(12, 2)) AS outstandingAmount
  FROM Doctor d
  LEFT JOIN appointment_scope a ON a.doctor_id = d.doctor_id
  LEFT JOIN prescription_scope ps ON ps.appointment_id = a.appointment_id
  LEFT JOIN bill_scope bs ON bs.appointment_id = a.appointment_id
  WHERE d.is_deleted = 0
  GROUP BY d.doctor_id, d.first_name, d.last_name, d.specialization
  ORDER BY totalAppointments DESC, billedAmount DESC, doctorName ASC;
END;
GO

IF OBJECT_ID('sp_GetInventoryRiskReport', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetInventoryRiskReport;
GO

CREATE PROCEDURE sp_GetInventoryRiskReport
  @lowStockThreshold INT = 10,
  @expiryDays INT = 30
AS
BEGIN
  SET NOCOUNT ON;

  ;WITH movement AS (
    SELECT
      medicine_id,
      SUM(CASE WHEN change_type = 'IN' THEN ISNULL(quantity, 0) ELSE 0 END) AS stockInLast30Days,
      SUM(CASE WHEN change_type = 'OUT' THEN ISNULL(quantity, 0) ELSE 0 END) AS stockOutLast30Days
    FROM Inventory_Log
    WHERE [date] >= DATEADD(DAY, -30, GETDATE())
    GROUP BY medicine_id
  ),
  batch_risk AS (
    SELECT
      medicine_id,
      MIN(CASE WHEN expiry_date >= CAST(GETDATE() AS DATE) THEN expiry_date END) AS nearestExpiryDate,
      SUM(CASE
            WHEN expiry_date < CAST(GETDATE() AS DATE)
            THEN ISNULL(quantity, 0)
            ELSE 0
          END) AS expiredQuantity,
      SUM(CASE
            WHEN expiry_date BETWEEN CAST(GETDATE() AS DATE)
                 AND DATEADD(DAY, @expiryDays, CAST(GETDATE() AS DATE))
            THEN ISNULL(quantity, 0)
            ELSE 0
          END) AS expiringSoonQuantity
    FROM Medicine_Batch
    GROUP BY medicine_id
  )
  SELECT
    m.medicine_id AS medicineId,
    m.name,
    m.category,
    CAST(ISNULL(m.unit_price, 0) AS DECIMAL(10, 2)) AS unitPrice,
    ISNULL(s.total_quantity, 0) AS totalQuantity,
    ISNULL(mv.stockInLast30Days, 0) AS stockInLast30Days,
    ISNULL(mv.stockOutLast30Days, 0) AS stockOutLast30Days,
    CAST(ISNULL(mv.stockOutLast30Days, 0) / 30.0 AS DECIMAL(10, 2)) AS avgDailyUsage,
    br.nearestExpiryDate,
    ISNULL(br.expiredQuantity, 0) AS expiredQuantity,
    ISNULL(br.expiringSoonQuantity, 0) AS expiringSoonQuantity,
    CASE
      WHEN ISNULL(s.total_quantity, 0) = 0 THEN 'OUT_OF_STOCK'
      WHEN ISNULL(br.expiredQuantity, 0) > 0 THEN 'EXPIRED_BATCH'
      WHEN ISNULL(s.total_quantity, 0) <= @lowStockThreshold THEN 'LOW_STOCK'
      WHEN ISNULL(br.expiringSoonQuantity, 0) > 0 THEN 'EXPIRING_SOON'
      ELSE 'NORMAL'
    END AS riskLevel,
    CASE
      WHEN ISNULL(s.total_quantity, 0) < (@lowStockThreshold * 2)
      THEN (@lowStockThreshold * 2) - ISNULL(s.total_quantity, 0)
      ELSE 0
    END AS suggestedReorderQuantity
  FROM Medicine m
  LEFT JOIN Stock s ON s.medicine_id = m.medicine_id
  LEFT JOIN movement mv ON mv.medicine_id = m.medicine_id
  LEFT JOIN batch_risk br ON br.medicine_id = m.medicine_id
  WHERE ISNULL(s.total_quantity, 0) <= @lowStockThreshold
     OR ISNULL(br.expiredQuantity, 0) > 0
     OR ISNULL(br.expiringSoonQuantity, 0) > 0
  ORDER BY
    CASE
      WHEN ISNULL(s.total_quantity, 0) = 0 THEN 1
      WHEN ISNULL(br.expiredQuantity, 0) > 0 THEN 2
      WHEN ISNULL(s.total_quantity, 0) <= @lowStockThreshold THEN 3
      WHEN ISNULL(br.expiringSoonQuantity, 0) > 0 THEN 4
      ELSE 5
    END,
    m.name ASC;
END;
GO
