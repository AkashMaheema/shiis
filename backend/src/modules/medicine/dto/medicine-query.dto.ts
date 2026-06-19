import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  IsBooleanString,
} from 'class-validator';
import { Type } from 'class-transformer';

export type SortOrder = 'ASC' | 'DESC';

export class MedicineQueryDto {
  /** Full-text search across name and category */
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by category */
  @IsOptional()
  @IsString()
  category?: string;

  /** Show only medicines with low or zero stock */
  @IsOptional()
  @IsBooleanString()
  lowStockOnly?: string;

  /** Field to sort by */
  @IsOptional()
  @IsIn(['name', 'category', 'unitPrice', 'medicineId', 'totalQuantity'])
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
