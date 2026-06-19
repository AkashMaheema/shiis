import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PaginatedResponse } from '../../common/dto/paginated-response.dto';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { Doctor } from './doctor.entity';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { DoctorQueryDto } from './dto/doctor-query.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

const SALT_ROUNDS = 12;

const SORT_COLUMN_MAP: Record<string, string> = {
  doctorId: 'd.doctorId',
  firstName: 'd.firstName',
  lastName: 'd.lastName',
  specialization: 'd.specialization',
  createdAt: 'd.createdAt',
};

@Injectable()
export class DoctorService {
  private readonly logger = new Logger(DoctorService.name);

  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private toResponse(doctor: Doctor) {
    return {
      doctorId: doctor.doctorId,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      specialization: doctor.specialization,
      phone: doctor.phone,
      email: doctor.email,
      address: doctor.address,
      userId: doctor.userId,
      username: doctor.user?.username ?? null,
      roleName: doctor.user?.role?.roleName ?? null,
      isDeleted: doctor.isDeleted,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };
  }

  private async findDoctorRole() {
    const role = await this.roleRepo.findOne({ where: { roleName: 'doctor' } });
    if (!role) {
      throw new BadRequestException("Role 'doctor' not found");
    }
    return role;
  }

  async findAll(query: DoctorQueryDto) {
    const {
      search,
      includeDeleted,
      sortBy = 'doctorId',
      sortOrder = 'ASC',
      page = 1,
      limit = 20,
    } = query;

    const showDeleted = includeDeleted === true || includeDeleted === 'true';
    const qb = this.doctorRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.user', 'user')
      .leftJoinAndSelect('user.role', 'role')
      .skip((page - 1) * limit)
      .take(limit);

    if (!showDeleted) {
      qb.andWhere('d.is_deleted = :deleted', { deleted: false });
    }

    if (search?.trim()) {
      qb.andWhere(
        `(d.first_name LIKE :q OR d.last_name LIKE :q OR d.email LIKE :q OR d.phone LIKE :q OR d.specialization LIKE :q OR user.username LIKE :q)`,
        { q: `%${search.trim()}%` },
      );
    }

    qb.orderBy(SORT_COLUMN_MAP[sortBy] ?? 'd.doctorId', sortOrder);

    const [data, total] = await qb.getManyAndCount();
    return PaginatedResponse.of(data.map((item) => this.toResponse(item)), total, page, limit);
  }

  async findOne(id: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctorId: id, isDeleted: false },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    return this.toResponse(doctor);
  }

  private async assertUniqueUsername(username: string, excludeUserId?: number) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.username) = LOWER(:username)', {
        username: username.trim(),
      });

    if (excludeUserId) {
      qb.andWhere('u.user_id != :excludeUserId', { excludeUserId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(`Username '${username}' is already in use`);
    }
  }

  private normalizeUsername(username: string): string {
    return username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  private buildBaseUsername(dto: Pick<CreateDoctorDto, 'firstName' | 'lastName' | 'username'>): string {
    return (
      this.normalizeUsername(dto.username || '') ||
      this.normalizeUsername(`${dto.firstName}${dto.lastName}`) ||
      'doctor'
    );
  }

  private async usernameExists(username: string, excludeUserId?: number): Promise<boolean> {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.username) = LOWER(:username)', { username });

    if (excludeUserId) {
      qb.andWhere('u.user_id != :excludeUserId', { excludeUserId });
    }

    return Boolean(await qb.getOne());
  }

  private async createUniqueUsername(baseUsername: string, excludeUserId?: number): Promise<string> {
    const base = this.normalizeUsername(baseUsername) || 'doctor';
    let candidate = base;
    let suffix = 2;

    while (await this.usernameExists(candidate, excludeUserId)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private async assertUniqueDoctorEmail(email?: string, excludeDoctorId?: number) {
    if (!email) return;

    const qb = this.doctorRepo
      .createQueryBuilder('d')
      .where('LOWER(d.email) = LOWER(:email)', { email: email.trim() })
      .andWhere('d.is_deleted = :deleted', { deleted: false });

    if (excludeDoctorId) {
      qb.andWhere('d.doctor_id != :excludeDoctorId', { excludeDoctorId });
    }

    const existing = await qb.getOne();
    if (existing) {
      throw new ConflictException(`A doctor with email ${email} already exists`);
    }
  }

  async create(dto: CreateDoctorDto, actorId?: number) {
    await this.assertUniqueDoctorEmail(dto.email);
    const username = await this.createUniqueUsername(this.buildBaseUsername(dto));

    const role = await this.findDoctorRole();
    const saved = await this.dataSource.transaction(async (manager) => {
      const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
      const user = manager.create(UserEntity, {
        username,
        password: hashedPassword,
        role,
      });
      const savedUser = await manager.save(UserEntity, user);

      const doctor = manager.create(Doctor, {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        specialization: dto.specialization?.trim() || null,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        address: dto.address?.trim() || null,
        userId: savedUser.userId,
        user: savedUser,
        createdBy: actorId ?? null,
        updatedBy: actorId ?? null,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });

      return manager.save(Doctor, doctor);
    });

    this.logger.log(`Created doctor ID ${saved.doctorId} with doctor user`);
    return this.toResponse(saved);
  }

  async update(id: number, dto: UpdateDoctorDto, actorId?: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctorId: id, isDeleted: false },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    if (dto.email !== undefined) {
      await this.assertUniqueDoctorEmail(dto.email, id);
    }

    if (dto.username !== undefined) {
      dto.username = this.normalizeUsername(dto.username);
      await this.assertUniqueUsername(dto.username, doctor.userId ?? undefined);
    }

    const updated = await this.dataSource.transaction(async (manager) => {
      if (dto.username !== undefined || dto.password) {
        if (!doctor.userId) {
          const role = await this.findDoctorRole();
          const password = dto.password ?? `${dto.firstName ?? doctor.firstName}123`;
          const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
          const user = manager.create(UserEntity, {
            username: await this.createUniqueUsername(
              dto.username ?? doctor.email ?? `doctor${id}`,
              doctor.userId ?? undefined,
            ),
            password: hashedPassword,
            role,
          });
          const savedUser = await manager.save(UserEntity, user);
          doctor.userId = savedUser.userId;
          doctor.user = savedUser;
        } else {
          const user = await manager.findOne(UserEntity, {
            where: { userId: doctor.userId },
          });
          if (user) {
            if (dto.username !== undefined) user.username = dto.username.trim();
            if (dto.password) {
              user.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
            }
            await manager.save(UserEntity, user);
          }
        }
      }

      if (dto.firstName !== undefined) doctor.firstName = dto.firstName.trim();
      if (dto.lastName !== undefined) doctor.lastName = dto.lastName.trim();
      if (dto.specialization !== undefined) {
        doctor.specialization = dto.specialization?.trim() || null;
      }
      if (dto.phone !== undefined) doctor.phone = dto.phone?.trim() || null;
      if (dto.email !== undefined) doctor.email = dto.email?.trim() || null;
      if (dto.address !== undefined) doctor.address = dto.address?.trim() || null;
      doctor.updatedBy = actorId ?? null;

      return manager.save(Doctor, doctor);
    });

    this.logger.log(`Updated doctor ID ${id}`);
    return this.findOne(updated.doctorId);
  }

  async remove(id: number, actorId?: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctorId: id, isDeleted: false },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    doctor.isDeleted = true;
    doctor.deletedAt = new Date();
    doctor.deletedBy = actorId ?? null;
    doctor.updatedBy = actorId ?? null;
    await this.doctorRepo.save(doctor);

    this.logger.log(`Archived doctor ID ${id}`);
    return { message: `Doctor ${id} archived successfully` };
  }
}
