-- ============================================================
-- Patch: Add missing audit columns to existing Supplier table
-- Run this if you already have a Supplier table from before V3
-- ============================================================

-- updated_at
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Supplier') AND name = 'updated_at'
)
BEGIN
  ALTER TABLE Supplier ADD updated_at DATETIME NULL;
  PRINT 'Added column: Supplier.updated_at';
END

-- created_by
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Supplier') AND name = 'created_by'
)
BEGIN
  ALTER TABLE Supplier ADD created_by INT NULL;
  PRINT 'Added column: Supplier.created_by';
END

-- updated_by
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Supplier') AND name = 'updated_by'
)
BEGIN
  ALTER TABLE Supplier ADD updated_by INT NULL;
  PRINT 'Added column: Supplier.updated_by';
END

-- is_deleted
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Supplier') AND name = 'is_deleted'
)
BEGIN
  ALTER TABLE Supplier ADD is_deleted BIT NOT NULL DEFAULT 0;
  PRINT 'Added column: Supplier.is_deleted';
END

-- deleted_at
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Supplier') AND name = 'deleted_at'
)
BEGIN
  ALTER TABLE Supplier ADD deleted_at DATETIME NULL;
  PRINT 'Added column: Supplier.deleted_at';
END

-- deleted_by
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Supplier') AND name = 'deleted_by'
)
BEGIN
  ALTER TABLE Supplier ADD deleted_by INT NULL;
  PRINT 'Added column: Supplier.deleted_by';
END

-- contact_person
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Supplier') AND name = 'contact_person'
)
BEGIN
  ALTER TABLE Supplier ADD contact_person VARCHAR(100) NULL;
  PRINT 'Added column: Supplier.contact_person';
END

-- city
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Supplier') AND name = 'city'
)
BEGIN
  ALTER TABLE Supplier ADD city VARCHAR(100) NULL;
  PRINT 'Added column: Supplier.city';
END

-- country
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Supplier') AND name = 'country'
)
BEGIN
  ALTER TABLE Supplier ADD country VARCHAR(100) NULL;
  PRINT 'Added column: Supplier.country';
END

-- ── Index for soft-delete queries ────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('Supplier') AND name = 'IX_Supplier_IsDeleted'
)
BEGIN
  CREATE INDEX IX_Supplier_IsDeleted ON Supplier (is_deleted, created_at DESC);
  PRINT 'Created index: IX_Supplier_IsDeleted';
END

-- ── SupplierAudit table ─────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.tables WHERE name = 'SupplierAudit'
)
BEGIN
  CREATE TABLE SupplierAudit (
    audit_id      INT IDENTITY(1,1) PRIMARY KEY,
    supplier_id   INT           NOT NULL,
    changed_by    INT           NULL,
    action        VARCHAR(10)   NOT NULL,
    snapshot      NVARCHAR(MAX) NOT NULL,
    diff          NVARCHAR(MAX) NULL,
    changed_at    DATETIME      NOT NULL DEFAULT GETDATE()
  );

  CREATE INDEX IX_SupplierAudit_SupplierId
    ON SupplierAudit (supplier_id, changed_at DESC);

  PRINT 'Created table: SupplierAudit';
END

PRINT 'Patch complete.';
