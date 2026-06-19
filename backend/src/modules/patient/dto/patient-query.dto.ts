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
import { Gender } from './create-patient.dto';

export type SortOrder = 'ASC' | 'DESC';

export class PatientQueryDto {
  /** Full-text search across first name, last name, email, phone */
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by gender */
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  /** Filter patients born on or after this date (YYYY-MM-DD) */
  @IsOptional()
  @IsDateString()
  dobFrom?: string;

  /** Filter patients born on or before this date (YYYY-MM-DD) */
  @IsOptional()
  @IsDateString()
  dobTo?: string;

  /** Include soft-deleted records (admin use) */
  @IsOptional()
  @IsIn(['true', 'false', true, false])
  includeDeleted?: string | boolean;

  /** Field to sort by */
  @IsOptional()
  @IsIn(['firstName', 'lastName', 'dob', 'createdAt', 'patientId'])
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
