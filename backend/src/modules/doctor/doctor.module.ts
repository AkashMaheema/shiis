import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { DoctorController } from './doctor.controller';
import { Doctor } from './doctor.entity';
import { DoctorService } from './doctor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, UserEntity, RoleEntity])],
  controllers: [DoctorController],
  providers: [DoctorService],
  exports: [DoctorService],
})
export class DoctorModule {}
