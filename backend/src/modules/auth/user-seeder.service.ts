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

function isHashed(password: string | null): boolean {
  return typeof password === 'string' && /^\$2[ab]\$/.test(password);
}

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
    try {
      const existingUsersCount = await this.userRepository.count();

      if (existingUsersCount === 0) {
        await this.seedRolesIfMissing();
        await this.seedDefaultUsers();
      } else {
        await this.rehashPlainPasswords();
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to seed users (tables might not exist yet): ${
          err.message || err
        }`,
      );
    }
  }

  private async seedRolesIfMissing(): Promise<void> {
    for (const defaultUser of DEFAULT_USERS) {
      const existingRole = await this.findRoleByName(defaultUser.roleName);

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

  private async rehashPlainPasswords(): Promise<void> {
    const allUsers = await this.userRepository.find();
    const toUpdate: UserEntity[] = [];

    for (const user of allUsers) {
      if (isHashed(user.password)) continue;

      const defaultUser = DEFAULT_USERS.find(
        (item) => item.username === user.username,
      );

      if (defaultUser) {
        user.password = await bcrypt.hash(defaultUser.password, SALT_ROUNDS);
      } else if (user.password) {
        this.logger.warn(
          `User "${user.username}" has a plain-text password; re-hashing`,
        );
        user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
      } else {
        continue;
      }

      toUpdate.push(user);
    }

    if (toUpdate.length === 0) {
      this.logger.log('All user passwords are already hashed');
      return;
    }

    await this.userRepository.save(toUpdate);
    this.logger.log(`Re-hashed passwords for ${toUpdate.length} user(s)`);
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
