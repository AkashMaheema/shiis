import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabTest } from './lab-test.entity';
import { LabRequest } from './lab-request.entity';
import { LabResult } from './lab-result.entity';
import { LabService } from './lab.service';
import { LabController } from './lab.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LabTest, LabRequest, LabResult])],
  controllers: [LabController],
  providers: [LabService],
  exports: [LabService],
})
export class LabModule {}
