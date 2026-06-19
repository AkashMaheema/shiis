import {
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export type SortOrder = 'ASC' | 'DESC';

export class PurchaseOrderQueryDto {
  /** Full-text search across notes, supplier */
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by status */
  @IsOptional()
  @IsIn(['Draft', 'Pending', 'Received', 'Cancelled'])
  status?: string;

  /** Filter by supplier */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplierId?: number;

  /** Orders placed on or after this date */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** Orders placed on or before this date */
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  /** Include soft-deleted records */
  @IsOptional()
  @IsIn(['true', 'false', true, false])
  includeDeleted?: string | boolean;

  /** Sort field */
  @IsOptional()
  @IsIn(['poId', 'orderDate', 'status', 'totalAmount', 'createdAt'])
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
