import {
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  IsString,
  IsNumber,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveItemDto {
  @IsInt()
  poItemId: number;

  @IsInt()
  medicineId: number;

  @IsInt()
  @Min(0)
  receivedQty: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  batchNo?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;
}

export class ReceiveOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];
}
