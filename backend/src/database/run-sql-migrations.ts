import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const logger = new Logger('SqlMigrations');

function splitSqlBatches(sql: string): string[] {
  return sql
    .split(/^\s*GO\s*$/gim)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function runSqlMigrations(dataSource: DataSource): Promise<void> {
  const migrationsDir = path.resolve(process.cwd(), 'src', 'migrations');

  await dataSource.query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.tables WHERE name = 'SchemaMigrations'
    )
    BEGIN
      CREATE TABLE SchemaMigrations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        migration_name NVARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT GETDATE()
      );
    END
  `);

  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const file of files) {
    const existing = await dataSource.query(
      `SELECT TOP 1 migration_name FROM SchemaMigrations WHERE migration_name = @0`,
      [file],
    );
    if (existing.length > 0) continue;

    logger.log(`Applying ${file}...`);
    const fullPath = path.join(migrationsDir, file);
    const sql = await fs.readFile(fullPath, 'utf8');
    const batches = splitSqlBatches(sql);

    for (const batch of batches) {
      await dataSource.query(batch);
    }

    await dataSource.query(
      `INSERT INTO SchemaMigrations (migration_name) VALUES (@0)`,
      [file],
    );
    logger.log(`Applied ${file}`);
  }
}

