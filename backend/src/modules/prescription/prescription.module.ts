import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescriptionController } from './prescription.controller';
import { PrescriptionService } from './prescription.service';
import { Prescription } from './prescription.entity';
import { PrescriptionItem } from './prescription-item.entity';
import { Medicine } from './medicine.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Prescription, PrescriptionItem, Medicine])],
  controllers: [PrescriptionController],
  providers: [PrescriptionService],
})
export class PrescriptionModule {}
