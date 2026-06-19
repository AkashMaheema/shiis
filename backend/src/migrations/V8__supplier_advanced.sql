-- ============================================================
-- Migration V3: Supplier Management
-- Run this against HealthcareInventoryDB
-- ============================================================

-- ── 1. Create Supplier table ─────────────────────────────────

IF NOT EXISTS (
  SELECT 1 FROM sys.tables WHERE name = 'Supplier'
)
BEGIN
  CREATE TABLE Supplier (
    supplier_id     INT IDENTITY(1,1) PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    contact_person  VARCHAR(100)  NULL,
    phone           VARCHAR(20)   NULL,
    email           VARCHAR(100)  NULL,
    address         VARCHAR(255)  NULL,
    city            VARCHAR(100)  NULL,
    country         VARCHAR(100)  NULL,

    -- Soft delete
    is_deleted      BIT           NOT NULL DEFAULT 0,
    deleted_at      DATETIME      NULL,
    deleted_by      INT           NULL,

    -- Audit timestamps
    created_at      DATETIME      NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME      NULL,
    created_by      INT           NULL,
    updated_by      INT           NULL
  );

  PRINT 'Created table: Supplier';
END
ELSE
BEGIN
  PRINT 'Table Supplier already exists — skipping';
END

-- ── 2. Add missing columns if table already existed (idempotent) ──────────

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Supplier') AND name = 'contact_person')
  ALTER TABLE Supplier ADD contact_person VARCHAR(100) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Supplier') AND name = 'city')
  ALTER TABLE Supplier ADD city VARCHAR(100) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Supplier') AND name = 'country')
  ALTER TABLE Supplier ADD country VARCHAR(100) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Supplier') AND name = 'is_deleted')
  ALTER TABLE Supplier ADD is_deleted BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Supplier') AND name = 'deleted_at')
  ALTER TABLE Supplier ADD deleted_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Supplier') AND name = 'deleted_by')
  ALTER TABLE Supplier ADD deleted_by INT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Supplier') AND name = 'created_at')
  ALTER TABLE Supplier ADD created_at DATETIME NOT NULL DEFAULT GETDATE();
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Supplier') AND name = 'updated_at')
  ALTER TABLE Supplier ADD updated_at DATETIME NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Supplier') AND name = 'created_by')
  ALTER TABLE Supplier ADD created_by INT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Supplier') AND name = 'updated_by')
  ALTER TABLE Supplier ADD updated_by INT NULL;

-- ── 3. Index for soft-delete queries (only after column is guaranteed) ───

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('Supplier') AND name = 'IX_Supplier_IsDeleted'
)
BEGIN
  CREATE INDEX IX_Supplier_IsDeleted ON Supplier (is_deleted, created_at DESC);
  PRINT 'Created index: IX_Supplier_IsDeleted';
END

-- ── 3. Create SupplierAudit table ───────────────────────────

IF NOT EXISTS (
  SELECT 1 FROM sys.tables WHERE name = 'SupplierAudit'
)
BEGIN
  CREATE TABLE SupplierAudit (
    audit_id      INT IDENTITY(1,1) PRIMARY KEY,
    supplier_id   INT           NOT NULL,
    changed_by    INT           NULL,
    action        VARCHAR(10)   NOT NULL,   -- CREATE | UPDATE | DELETE
    snapshot      NVARCHAR(MAX) NOT NULL,   -- JSON of supplier record
    diff          NVARCHAR(MAX) NULL,       -- JSON of changed fields only
    changed_at    DATETIME      NOT NULL DEFAULT GETDATE()
  );

  CREATE INDEX IX_SupplierAudit_SupplierId
    ON SupplierAudit (supplier_id, changed_at DESC);

  PRINT 'Created table: SupplierAudit';
END
ELSE
BEGIN
  PRINT 'Table SupplierAudit already exists — skipping';
END

-- ── 4. Stored Procedure: Upsert Supplier ────────────────────
-- Handles both INSERT and UPDATE in a single call.
-- @supplierId = NULL → INSERT, non-NULL → UPDATE

IF OBJECT_ID('sp_UpsertSupplier', 'P') IS NOT NULL
  DROP PROCEDURE sp_UpsertSupplier;
GO

CREATE PROCEDURE sp_UpsertSupplier
  @supplierId    INT           = NULL,
  @name          VARCHAR(100),
  @contactPerson VARCHAR(100)  = NULL,
  @phone         VARCHAR(20)   = NULL,
  @email         VARCHAR(100)  = NULL,
  @address       VARCHAR(255)  = NULL,
  @city          VARCHAR(100)  = NULL,
  @country       VARCHAR(100)  = NULL,
  @actorId       INT           = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF @supplierId IS NULL
  BEGIN
    -- ── INSERT ──────────────────────────────────────────────
    INSERT INTO Supplier
      (name, contact_person, phone, email, address, city, country,
       is_deleted, created_at, updated_at, created_by, updated_by)
    VALUES
      (@name, @contactPerson, @phone, @email, @address, @city, @country,
       0, GETDATE(), GETDATE(), @actorId, @actorId);

    SELECT SCOPE_IDENTITY() AS newSupplierId;
  END
  ELSE
  BEGIN
    -- ── UPDATE ──────────────────────────────────────────────
    UPDATE Supplier
    SET
      name           = @name,
      contact_person = @contactPerson,
      phone          = @phone,
      email          = @email,
      address        = @address,
      city           = @city,
      country        = @country,
      updated_at     = GETDATE(),
      updated_by     = @actorId
    WHERE supplier_id = @supplierId
      AND is_deleted  = 0;

    SELECT @supplierId AS newSupplierId;
  END
END
GO

PRINT 'Created stored procedure: sp_UpsertSupplier';

-- ── 5. Stored Procedure: Supplier Stats ─────────────────────

IF OBJECT_ID('sp_GetSupplierStats', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetSupplierStats;
GO

CREATE PROCEDURE sp_GetSupplierStats
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @now         DATETIME = GETDATE();
  DECLARE @firstOfMonth DATETIME = DATEFROMPARTS(YEAR(@now), MONTH(@now), 1);

  SELECT
    (SELECT COUNT(*) FROM Supplier)                                       AS total,
    (SELECT COUNT(*) FROM Supplier WHERE is_deleted = 0)                  AS active,
    (SELECT COUNT(*) FROM Supplier WHERE is_deleted = 1)                  AS archived,
    (SELECT COUNT(*) FROM Supplier
     WHERE  is_deleted = 0 AND created_at >= @firstOfMonth)              AS addedThisMonth;
END
GO

PRINT 'Created stored procedure: sp_GetSupplierStats';

-- ── 6. Stored Procedure: Supplier Summary ───────────────────

IF OBJECT_ID('sp_GetSupplierSummary', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetSupplierSummary;
GO

CREATE PROCEDURE sp_GetSupplierSummary
  @supplierId INT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    s.supplier_id     AS supplierId,
    s.name,
    s.contact_person  AS contactPerson,
    s.phone,
    s.email,
    s.address,
    s.city,
    s.country,
    s.is_deleted      AS isDeleted,
    s.created_at      AS createdAt,
    s.updated_at      AS updatedAt,
    (
      SELECT COUNT(*) FROM SupplierAudit a WHERE a.supplier_id = s.supplier_id
    )                 AS auditCount,
    (
      SELECT TOP 1 a.changed_at
      FROM SupplierAudit a
      WHERE a.supplier_id = s.supplier_id
      ORDER BY a.changed_at DESC
    )                 AS lastModified
  FROM Supplier s
  WHERE s.supplier_id = @supplierId;
END
GO

PRINT 'Created stored procedure: sp_GetSupplierSummary';
