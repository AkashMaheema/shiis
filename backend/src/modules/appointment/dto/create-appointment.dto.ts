import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

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
