import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  MaxLength,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AppointmentStatus {
  SCHEDULED = 'Scheduled',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  NO_SHOW = 'No Show',
}

export class CreateAppointmentDto {
  @IsInt()
  @IsNotEmpty()
  patientId: number;

  @IsInt()
  @IsNotEmpty()
  doctorId: number;

  @IsDateString()
  @IsNotEmpty()
  appointmentDate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  appointmentTime: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consultationFee?: number;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Injected server-side from the JWT — not accepted from the request body */
  @IsOptional()
  @IsInt()
  createdBy?: number;
}
