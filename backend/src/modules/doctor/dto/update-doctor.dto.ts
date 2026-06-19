import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorDto } from './create-doctor.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
