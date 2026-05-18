import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { runSqlMigrations } from '../database/run-sql-migrations';

async function run(): Promise<void> {
  const logger = new Logger('StartMigrations');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);
    await runSqlMigrations(dataSource);
    logger.log('SQL migrations completed.');
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  const logger = new Logger('StartMigrations');
  logger.error('Migration run failed', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});

