import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export type SortOrder = 'ASC' | 'DESC';

export class SupplierQueryDto {
  /** Full-text search across name, contact person, email, phone */
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by city */
  @IsOptional()
  @IsString()
  city?: string;

  /** Filter by country */
  @IsOptional()
  @IsString()
  country?: string;

  /** Include soft-deleted records (admin use) */
  @IsOptional()
  @IsIn(['true', 'false', true, false])
  includeDeleted?: string | boolean;

  /** Field to sort by */
  @IsOptional()
  @IsIn(['name', 'city', 'country', 'createdAt', 'supplierId'])
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
  @Max(100)
  limit?: number = 20;
}
