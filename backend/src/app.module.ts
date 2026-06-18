import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { PatientModule } from './modules/patient/patient.module';
import { UsersModule } from './modules/users/users.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { LabModule } from './modules/lab/lab.module';

@Module({
  imports: [
    // Global config from .env
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),

    // TypeORM — MSSQL with Windows Authentication
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mssql',
        driver: configService.get<any>('database.driver'),
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        database: configService.get<string>('database.database'),
        extra: configService.get<Record<string, unknown>>('database.extra'),
        options: {
          trustedConnection: configService.get<boolean>(
            'database.options.trustedConnection',
          ),
          encrypt: configService.get<boolean>('database.options.encrypt'),
          trustServerCertificate: configService.get<boolean>(
            'database.options.trustServerCertificate',
          ),
        },
        autoLoadEntities: true,
        synchronize: false,
        logging: configService.get<string>('app.nodeEnv') === 'development',
      }),
    }),

    // Feature Modules
    AuthModule,
    PatientModule,
    UsersModule,
    AppointmentModule,
    LabModule,
  ],
})
export class AppModule {}
