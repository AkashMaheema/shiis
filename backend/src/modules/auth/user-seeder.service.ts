import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RoleEntity } from './entities/role.entity';
import { UserEntity } from './entities/user.entity';

const SALT_ROUNDS = 12;

const DEFAULT_USERS = [
  { username: 'admin', password: 'Admin@123', roleName: 'Admin' },
  { username: 'doctor01', password: 'Doctor@123', roleName: 'Doctor' },
  { username: 'nurse01', password: 'Nurse@123', roleName: 'Nurse' },
  { username: 'pharma01', password: 'Pharma@123', roleName: 'Pharmacist' },
  { username: 'lab01', password: 'Lab@123', roleName: 'Lab Staff' },
  { username: 'recep01', password: 'Reception@123', roleName: 'Receptionist' },
  { username: 'acc01', password: 'Account@123', roleName: 'Accountant' },
  {
    username: 'inventory01',
    password: 'Inventory@123',
    roleName: 'Inventory Manager',
  },
  {
    username: 'supplier01',
    password: 'Supplier@123',
    roleName: 'Supplier Manager',
  },
  { username: 'manager01', password: 'Manager@123', roleName: 'Manager' },
];

@Injectable()
export class UserSeederService implements OnModuleInit {
  private readonly logger = new Logger(UserSeederService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,

    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const existingUsersCount = await this.userRepository.count();

    if (existingUsersCount > 0) {
      this.logger.log(
        `User seeding skipped: found ${existingUsersCount} existing user(s)`,
      );
      return;
    }

    await this.seedRolesIfMissing();
    await this.seedDefaultUsers();
  }

  private async seedRolesIfMissing(): Promise<void> {
    for (const defaultUser of DEFAULT_USERS) {
      const existingRole = await this.roleRepository
        .createQueryBuilder('role')
        .where('LOWER(role.roleName) = LOWER(:roleName)', {
          roleName: defaultUser.roleName,
        })
        .orWhere('LOWER(role.role_name) = LOWER(:roleName)', {
          roleName: defaultUser.roleName,
        })
        .getOne()
        .catch(() => null);

      if (existingRole) continue;

      const role = this.roleRepository.create({
        roleName: defaultUser.roleName,
      } as Partial<RoleEntity>);

      await this.roleRepository.save(role);
      this.logger.log(`Created missing role: ${defaultUser.roleName}`);
    }
  }

  private async seedDefaultUsers(): Promise<void> {
    for (const defaultUser of DEFAULT_USERS) {
      const role = await this.findRoleByName(defaultUser.roleName);

      if (!role) {
        this.logger.warn(
          `Skipping user "${defaultUser.username}": role "${defaultUser.roleName}" not found`,
        );
        continue;
      }

      const hashedPassword = await bcrypt.hash(
        defaultUser.password,
        SALT_ROUNDS,
      );

      const user = this.userRepository.create({
        username: defaultUser.username,
        password: hashedPassword,
        role,
      });

      await this.userRepository.save(user);
      this.logger.log(`Seeded default user: ${defaultUser.username}`);
    }
  }

  private async findRoleByName(roleName: string): Promise<RoleEntity | null> {
    return this.roleRepository
      .createQueryBuilder('role')
      .where('LOWER(role.roleName) = LOWER(:roleName)', { roleName })
      .orWhere('LOWER(role.role_name) = LOWER(:roleName)', { roleName })
      .getOne()
      .catch(() => null);
  }
}
