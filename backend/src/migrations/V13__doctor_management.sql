-- ============================================================
-- Migration V13: Doctor management and linked doctor users
-- ============================================================

IF OBJECT_ID('Doctor', 'U') IS NULL
BEGIN
  CREATE TABLE Doctor (
    doctor_id INT IDENTITY(1,1) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    specialization VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    address VARCHAR(255) NULL,
    user_id INT NULL,
    is_deleted BIT NOT NULL CONSTRAINT DF_Doctor_IsDeleted DEFAULT 0,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,
    created_at DATETIME NULL CONSTRAINT DF_Doctor_CreatedAt DEFAULT GETDATE(),
    updated_at DATETIME NULL CONSTRAINT DF_Doctor_UpdatedAt DEFAULT GETDATE(),
    created_by INT NULL,
    updated_by INT NULL
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'specialization')
  ALTER TABLE Doctor ADD specialization VARCHAR(100) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'phone')
  ALTER TABLE Doctor ADD phone VARCHAR(20) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'email')
  ALTER TABLE Doctor ADD email VARCHAR(100) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'address')
  ALTER TABLE Doctor ADD address VARCHAR(255) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'user_id')
  ALTER TABLE Doctor ADD user_id INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'is_deleted')
  ALTER TABLE Doctor ADD is_deleted BIT NOT NULL CONSTRAINT DF_Doctor_IsDeleted DEFAULT 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'deleted_at')
  ALTER TABLE Doctor ADD deleted_at DATETIME NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'deleted_by')
  ALTER TABLE Doctor ADD deleted_by INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'created_at')
  ALTER TABLE Doctor ADD created_at DATETIME NULL CONSTRAINT DF_Doctor_CreatedAt DEFAULT GETDATE();
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'updated_at')
  ALTER TABLE Doctor ADD updated_at DATETIME NULL CONSTRAINT DF_Doctor_UpdatedAt DEFAULT GETDATE();
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'created_by')
  ALTER TABLE Doctor ADD created_by INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctor') AND name = 'updated_by')
  ALTER TABLE Doctor ADD updated_by INT NULL;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Doctor_User'
)
BEGIN
  ALTER TABLE Doctor
    ADD CONSTRAINT FK_Doctor_User
    FOREIGN KEY (user_id) REFERENCES [User](user_id);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes WHERE name = 'UX_Doctor_UserId' AND object_id = OBJECT_ID('Doctor')
)
BEGIN
  CREATE UNIQUE INDEX UX_Doctor_UserId
    ON Doctor(user_id)
    WHERE user_id IS NOT NULL;
END
GO
