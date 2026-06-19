-- ============================================================
-- Migration V8: Stock In — Purchase Orders, Batch & Expiry Tracking
-- Run against HealthcareInventoryDB
-- ============================================================

-- ── 1. Extend Purchase_Order ─────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Purchase_Order') AND name = 'notes')
  ALTER TABLE Purchase_Order ADD notes VARCHAR(500) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Purchase_Order') AND name = 'total_amount')
  ALTER TABLE Purchase_Order ADD total_amount DECIMAL(12,2) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Purchase_Order') AND name = 'is_deleted')
  ALTER TABLE Purchase_Order ADD is_deleted BIT NOT NULL DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Purchase_Order') AND name = 'deleted_at')
  ALTER TABLE Purchase_Order ADD deleted_at DATETIME NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Purchase_Order') AND name = 'deleted_by')
  ALTER TABLE Purchase_Order ADD deleted_by INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Purchase_Order') AND name = 'created_at')
  ALTER TABLE Purchase_Order ADD created_at DATETIME NOT NULL DEFAULT GETDATE();

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Purchase_Order') AND name = 'updated_at')
  ALTER TABLE Purchase_Order ADD updated_at DATETIME NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Purchase_Order') AND name = 'created_by')
  ALTER TABLE Purchase_Order ADD created_by INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Purchase_Order') AND name = 'updated_by')
  ALTER TABLE Purchase_Order ADD updated_by INT NULL;

PRINT 'Extended Purchase_Order';

-- ── 2. Extend Purchase_Order_Item ────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Purchase_Order_Item') AND name = 'received_qty')
  ALTER TABLE Purchase_Order_Item ADD received_qty INT NOT NULL DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Purchase_Order_Item') AND name = 'notes')
  ALTER TABLE Purchase_Order_Item ADD notes VARCHAR(255) NULL;

PRINT 'Extended Purchase_Order_Item';

-- ── 3. Extend Stock ──────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Stock') AND name = 'created_at')
  ALTER TABLE Stock ADD created_at DATETIME NOT NULL DEFAULT GETDATE();

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Stock') AND name = 'updated_at')
  ALTER TABLE Stock ADD updated_at DATETIME NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Stock') AND name = 'updated_by')
  ALTER TABLE Stock ADD updated_by INT NULL;

PRINT 'Extended Stock';

-- ── 4. Extend Medicine_Batch (batch & expiry tracking) ───────

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Medicine_Batch') AND name = 'po_id')
  ALTER TABLE Medicine_Batch ADD po_id INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Medicine_Batch') AND name = 'cost_price')
  ALTER TABLE Medicine_Batch ADD cost_price DECIMAL(12,2) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Medicine_Batch') AND name = 'created_at')
  ALTER TABLE Medicine_Batch ADD created_at DATETIME NOT NULL DEFAULT GETDATE();

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Medicine_Batch') AND name = 'created_by')
  ALTER TABLE Medicine_Batch ADD created_by INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Medicine_Batch') AND name = 'is_active')
  ALTER TABLE Medicine_Batch ADD is_active BIT NOT NULL DEFAULT 1;

PRINT 'Extended Medicine_Batch';

-- ── 5. Extend Inventory_Log ──────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Inventory_Log') AND name = 'po_id')
  ALTER TABLE Inventory_Log ADD po_id INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Inventory_Log') AND name = 'created_by')
  ALTER TABLE Inventory_Log ADD created_by INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Inventory_Log') AND name = 'notes')
  ALTER TABLE Inventory_Log ADD notes VARCHAR(255) NULL;

PRINT 'Extended Inventory_Log';

-- ── 6. Indexes ───────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Purchase_Order') AND name = 'IX_PO_IsDeleted')
  CREATE INDEX IX_PO_IsDeleted ON Purchase_Order (is_deleted, created_at DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Medicine_Batch') AND name = 'IX_Batch_Expiry')
  CREATE INDEX IX_Batch_Expiry ON Medicine_Batch (expiry_date, is_active);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Medicine_Batch') AND name = 'IX_Batch_Medicine')
  CREATE INDEX IX_Batch_Medicine ON Medicine_Batch (medicine_id, is_active);

PRINT 'Created indexes';

-- ── 7. sp_CreatePurchaseOrder ────────────────────────────────
-- Creates the PO header. Items are inserted separately by the app layer.

IF OBJECT_ID('sp_CreatePurchaseOrder', 'P') IS NOT NULL
  DROP PROCEDURE sp_CreatePurchaseOrder;
GO

CREATE PROCEDURE sp_CreatePurchaseOrder
  @supplierId   INT,
  @orderDate    DATETIME      = NULL,
  @notes        VARCHAR(500)  = NULL,
  @status       VARCHAR(20)   = 'Draft',
  @totalAmount  DECIMAL(12,2) = NULL,
  @actorId      INT           = NULL
AS
BEGIN
  SET NOCOUNT ON;

  INSERT INTO Purchase_Order
    (supplier_id, order_date, status, notes, total_amount,
     is_deleted, created_at, updated_at, created_by, updated_by)
  VALUES
    (@supplierId, ISNULL(@orderDate, GETDATE()), @status, @notes, @totalAmount,
     0, GETDATE(), GETDATE(), @actorId, @actorId);

  SELECT SCOPE_IDENTITY() AS newPoId;
END
GO

PRINT 'Created sp_CreatePurchaseOrder';

-- ── 8. sp_ReceivePurchaseOrder ───────────────────────────────
-- Processes one PO item: inserts Medicine_Batch, upserts Stock,
-- logs Inventory_Log. Call once per item when receiving.

IF OBJECT_ID('sp_ReceivePurchaseOrder', 'P') IS NOT NULL
  DROP PROCEDURE sp_ReceivePurchaseOrder;
GO

CREATE PROCEDURE sp_ReceivePurchaseOrder
  @poId         INT,
  @poItemId     INT,
  @medicineId   INT,
  @receivedQty  INT,
  @batchNo      VARCHAR(50)   = NULL,
  @expiryDate   DATE          = NULL,
  @costPrice    DECIMAL(12,2) = NULL,
  @actorId      INT           = NULL
AS
BEGIN
  SET NOCOUNT ON;
  BEGIN TRANSACTION;

  BEGIN TRY
    -- 1. Record received qty on the item row
    UPDATE Purchase_Order_Item
    SET received_qty = @receivedQty
    WHERE po_item_id = @poItemId;

    -- 2. Insert Medicine_Batch row (batch & expiry tracking)
    INSERT INTO Medicine_Batch (medicine_id, batch_no, expiry_date, quantity, po_id, cost_price, created_at, created_by, is_active)
    VALUES (@medicineId, @batchNo, @expiryDate, @receivedQty, @poId, @costPrice, GETDATE(), @actorId, 1);

    -- 3. Upsert Stock — increment total_quantity
    IF EXISTS (SELECT 1 FROM Stock WHERE medicine_id = @medicineId)
    BEGIN
      UPDATE Stock
      SET total_quantity = total_quantity + @receivedQty,
          updated_at     = GETDATE(),
          updated_by     = @actorId
      WHERE medicine_id = @medicineId;
    END
    ELSE
    BEGIN
      INSERT INTO Stock (medicine_id, total_quantity, created_at, updated_at, updated_by)
      VALUES (@medicineId, @receivedQty, GETDATE(), GETDATE(), @actorId);
    END

    -- 4. Inventory log
    INSERT INTO Inventory_Log (medicine_id, change_type, quantity, date, po_id, created_by, notes)
    VALUES (@medicineId, 'IN', @receivedQty, GETDATE(), @poId, @actorId,
            CONCAT('PO #', @poId, ' — Batch: ', ISNULL(@batchNo, 'N/A')));

    COMMIT TRANSACTION;
    SELECT 1 AS success;
  END TRY
  BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END
GO

PRINT 'Created sp_ReceivePurchaseOrder';

-- ── 9. sp_GetPurchaseOrderStats ──────────────────────────────

IF OBJECT_ID('sp_GetPurchaseOrderStats', 'P') IS NOT NULL
  DROP PROCEDURE sp_GetPurchaseOrderStats;
GO

CREATE PROCEDURE sp_GetPurchaseOrderStats
AS
BEGIN
  SET NOCOUNT ON;
  SELECT
    (SELECT COUNT(*) FROM Purchase_Order WHERE is_deleted = 0)                          AS total,
    (SELECT COUNT(*) FROM Purchase_Order WHERE status = 'Draft'     AND is_deleted = 0) AS draft,
    (SELECT COUNT(*) FROM Purchase_Order WHERE status = 'Pending'   AND is_deleted = 0) AS pending,
    (SELECT COUNT(*) FROM Purchase_Order WHERE status = 'Received'  AND is_deleted = 0) AS received,
    (SELECT COUNT(*) FROM Purchase_Order WHERE status = 'Cancelled' AND is_deleted = 0) AS cancelled;
END
GO

PRINT 'Created sp_GetPurchaseOrderStats';

-- ── 10. sp_CancelPurchaseOrder ───────────────────────────────

IF OBJECT_ID('sp_CancelPurchaseOrder', 'P') IS NOT NULL
  DROP PROCEDURE sp_CancelPurchaseOrder;
GO

CREATE PROCEDURE sp_CancelPurchaseOrder
  @poId    INT,
  @actorId INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Purchase_Order
  SET status     = 'Cancelled',
      updated_at = GETDATE(),
      updated_by = @actorId
  WHERE po_id    = @poId
    AND is_deleted = 0
    AND status NOT IN ('Received');

  SELECT @@ROWCOUNT AS rowsAffected;
END
GO

PRINT 'Created sp_CancelPurchaseOrder';
