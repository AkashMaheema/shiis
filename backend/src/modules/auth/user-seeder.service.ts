import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RoleEntity } from './entities/role.entity';
import { UserEntity } from './entities/user.entity';

const SALT_ROUNDS = 12;

const DEFAULT_USERS = [
  { username: 'admin', password: 'admin123', roleName: 'admin' },
  { username: 'doctor', password: 'doctor123', roleName: 'doctor' },
  { username: 'lab', password: 'lab123', roleName: 'lab' },
];

/** bcrypt hashes always start with $2b$ or $2a$ */
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

  async onModuleInit() {
    try {
      const existingUsers = await this.userRepository.count();

      if (existingUsers === 0) {
        // Fresh DB — seed all default users with hashed passwords
        await this.seedFresh();
      } else {
        // DB already has users — re-hash any that still have plain-text passwords
        await this.rehashPlainPasswords();
      }
    } catch (err: any) {
      this.logger.warn(`Failed to seed users (tables might not exist yet): ${err.message || err}`);
    }
  }

  // ── Fresh seed ────────────────────────────────────────────────────────────

  private async seedFresh(): Promise<void> {
    const seededUsers: UserEntity[] = [];

    for (const defaultUser of DEFAULT_USERS) {
      const role = await this.roleRepository.findOne({
        where: { roleName: defaultUser.roleName },
      });

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

      seededUsers.push(
        this.userRepository.create({
          username: defaultUser.username,
          password: hashedPassword,
          role,
        }),
      );
    }

    if (seededUsers.length === 0) return;

    await this.userRepository.save(seededUsers);
    this.logger.log(
      `Seeded ${seededUsers.length} default users with hashed passwords`,
    );
  }

  // ── Re-hash plain-text passwords ──────────────────────────────────────────

  private async rehashPlainPasswords(): Promise<void> {
    const allUsers = await this.userRepository.find();
    const toUpdate: UserEntity[] = [];

    for (const user of allUsers) {
      if (isHashed(user.password)) {
        // Already hashed — skip
        continue;
      }

      // Find the known plain-text password for this username
      const defaultUser = DEFAULT_USERS.find(
        (u) => u.username === user.username,
      );

      if (!defaultUser) {
        // Unknown user with plain-text password — hash whatever is stored
        if (user.password) {
          this.logger.warn(
            `User "${user.username}" has a plain-text password — re-hashing`,
          );
          user.password = await bcrypt.hash(user.password, SALT_ROUNDS);
          toUpdate.push(user);
        }
        continue;
      }

      this.logger.log(
        `Re-hashing plain-text password for user "${user.username}"`,
      );
      user.password = await bcrypt.hash(defaultUser.password, SALT_ROUNDS);
      toUpdate.push(user);
    }

    if (toUpdate.length === 0) {
      this.logger.log('All user passwords are already hashed — nothing to do');
      return;
    }

    await this.userRepository.save(toUpdate);
    this.logger.log(
      `Re-hashed passwords for ${toUpdate.length} user(s): ${toUpdate.map((u) => u.username).join(', ')}`,
    );
  }
}
