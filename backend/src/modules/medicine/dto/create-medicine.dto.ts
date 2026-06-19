import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  IsNotEmpty,
  Min,
} from 'class-validator';

export class CreateMedicineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;
}
