import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentStatus } from './create-appointment.dto';

export type SortOrder = 'ASC' | 'DESC';

export class AppointmentQueryDto {
  /** Full-text search across patient name and reason */
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by status */
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  /** Filter appointments on or after this date (YYYY-MM-DD) */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** Filter appointments on or before this date (YYYY-MM-DD) */
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  /** Filter by specific patient */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  patientId?: number;

  /** Include soft-deleted records (admin use) */
  @IsOptional()
  @IsIn(['true', 'false', true, false])
  includeDeleted?: string | boolean;

  /** Field to sort by */
  @IsOptional()
  @IsIn(['appointmentDate', 'status', 'createdAt', 'appointmentId'])
  sortBy?: string;

  /** Sort direction */
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: SortOrder;

  /** Page number (1-based) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** Records per page */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 20;
}
