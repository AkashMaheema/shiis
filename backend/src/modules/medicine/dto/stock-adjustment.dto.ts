import {
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

export class StockAdjustmentDto {
  @IsInt()
  @Min(1)
  quantity: number;

  @IsIn(['IN', 'OUT'])
  changeType: 'IN' | 'OUT';

  /** Optional batch number for incoming stock */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  batchNo?: string;

  /** Optional expiry date for incoming stock */
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
