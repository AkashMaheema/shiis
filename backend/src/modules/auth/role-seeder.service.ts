import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from './entities/role.entity';

const DEFAULT_ROLES = [
  'admin',
  'doctor',
  'lab',
  'nurse',
  'receptionist',
  'pharmacist',
  'inventory manager',
  'billing',
  'accountant',
  'lab technician',
];

@Injectable()
export class RoleSeederService implements OnModuleInit {
  private readonly logger = new Logger(RoleSeederService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async onModuleInit() {
    try {
      const existingRoles = await this.roleRepository.count();

      if (existingRoles > 0) {
        return;
      }

      const roles = DEFAULT_ROLES.map((roleName) =>
        this.roleRepository.create({ roleName }),
      );

      await this.roleRepository.save(roles);
      this.logger.log(`Seeded ${roles.length} default roles`);
    } catch (err: any) {
      this.logger.warn(`Failed to seed roles (tables might not exist yet): ${err.message || err}`);
    }
  }
}