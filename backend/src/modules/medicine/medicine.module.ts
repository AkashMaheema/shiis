import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medicine } from './medicine.entity';
import { MedicineBatch } from './medicine-batch.entity';
import { Stock } from './stock.entity';
import { InventoryLog } from './inventory-log.entity';
import { MedicineService } from './medicine.service';
import { MedicineController } from './medicine.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Medicine, MedicineBatch, Stock, InventoryLog]),
  ],
  controllers: [MedicineController],
  providers: [MedicineService],
  exports: [MedicineService],
})
export class MedicineModule {}
