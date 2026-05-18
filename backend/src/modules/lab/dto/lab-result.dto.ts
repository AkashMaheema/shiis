import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateLabResultDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  resultDetails: string;

  @IsOptional()
  @IsDateString()
  resultDate?: string;
}

export class UpdateLabResultDto extends PartialType(CreateLabResultDto) {}
