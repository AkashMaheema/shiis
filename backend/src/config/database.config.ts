/// <reference path="../types/mssql-msnodesqlv8.d.ts" />
import { registerAs } from '@nestjs/config';
import sql from 'mssql/msnodesqlv8';

export default registerAs('database', () => {
  const rawHost = process.env.DB_HOST || 'localhost';
  const normalizedHost = rawHost.replace(/\\\\/g, '\\');
  const database = process.env.DB_DATABASE || 'HealthcareInventoryDB';
  const encrypt = process.env.DB_ENCRYPT === 'true';
  const trustServerCertificate = process.env.DB_TRUST_CERT === 'true';
  const username = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD;
  const useSqlAuthentication = Boolean(username && password !== undefined);
  const connectionString = useSqlAuthentication
    ? `Driver={ODBC Driver 17 for SQL Server};` +
      `Server=${normalizedHost};` +
      `Database=${database};` +
      `Uid=${username};` +
      `Pwd=${password};` +
      `Encrypt=${encrypt ? 'Yes' : 'No'};` +
      `TrustServerCertificate=${trustServerCertificate ? 'Yes' : 'No'};` +
      'Persist Security Info=False;' +
      'Pooling=False;' +
      'MultipleActiveResultSets=False;' +
      'Command Timeout=2147483647;'
    : `Driver={ODBC Driver 17 for SQL Server};` +
      `Server=${normalizedHost};` +
      `Database=${database};` +
      'Trusted_Connection=Yes;' +
      `Encrypt=${encrypt ? 'Yes' : 'No'};` +
      `TrustServerCertificate=${trustServerCertificate ? 'Yes' : 'No'};` +
      'Persist Security Info=False;' +
      'Pooling=False;' +
      'MultipleActiveResultSets=False;' +
      'Command Timeout=2147483647;';

  return {
    type: 'mssql' as const,
    driver: sql,
    host: normalizedHost,
    port: parseInt(process.env.DB_PORT ?? '1433', 10),
    database,
    extra: {
      connectionString,
    },
    options: {
      trustedConnection: !useSqlAuthentication,
      encrypt,
      trustServerCertificate,
    },
    autoLoadEntities: true,
    synchronize: false, // Never auto-sync — we use SQL scripts
    logging: process.env.NODE_ENV === 'development',
  };
});
