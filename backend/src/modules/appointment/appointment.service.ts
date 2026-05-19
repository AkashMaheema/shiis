import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { AppointmentAudit, AuditAction } from './appointment-audit.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { PaginatedResponse } from '../../common/dto/paginated-response.dto';

// Column name map: DTO field → entity property alias used in QueryBuilder
const SORT_COLUMN_MAP: Record<string, string> = {
  appointmentDate: 'a.appointmentDate',
  status: 'a.status',
  createdAt: 'a.createdAt',
  appointmentId: 'a.appointmentId',
};

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  private validateAppointmentDateNotPast(
    appointmentDate?: string | Date,
    field = 'appointmentDate',
  ): void {
    if (!appointmentDate) return;

    const candidate = new Date(appointmentDate);
    if (Number.isNaN(candidate.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }

    const candidateDay = new Date(
      candidate.getFullYear(),
      candidate.getMonth(),
      candidate.getDate(),
    );
    const today = new Date();
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (candidateDay < todayDay) {
      throw new BadRequestException(`${field} cannot be in the past`);
    }
  }

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(AppointmentAudit)
    private readonly auditRepo: Repository<AppointmentAudit>,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Build a diff object showing what changed between two appointment snapshots.
   * Returns null when nothing changed.
   */
  private buildDiff(
    before: Partial<Appointment>,
    after: Partial<Appointment>,
  ): Record<string, { from: unknown; to: unknown }> | null {
    const tracked: (keyof Appointment)[] = [
      'patientId',
      'doctorId',
      'appointmentDate',
      'appointmentTime',
      'status',
      'reason',
      'notes',
    ];

    const diff: Record<string, { from: unknown; to: unknown }> = {};

    for (const key of tracked) {
      const oldVal = before[key];
      const newVal = after[key];
      const oldStr =
        oldVal instanceof Date ? oldVal.toISOString() : String(oldVal ?? '');
      const newStr =
        newVal instanceof Date ? newVal.toISOString() : String(newVal ?? '');
      if (oldStr !== newStr) {
        diff[key] = { from: oldVal ?? null, to: newVal ?? null };
      }
    }

    return Object.keys(diff).length > 0 ? diff : null;
  }

  /** Write a row to AppointmentAudit. Never throws — audit failures are logged only. */
  private async writeAudit(
    appointmentId: number,
    action: AuditAction,
    snapshot: Appointment,
    changedBy: number | null,
    diff?: Record<string, { from: unknown; to: unknown }> | null,
  ): Promise<void> {
    try {
      const entry = this.auditRepo.create({
        appointmentId,
        action,
        changedBy,
        snapshot: JSON.stringify(snapshot),
        diff: diff ? JSON.stringify(diff) : null,
      });
      await this.auditRepo.save(entry);
    } catch (err) {
      this.logger.error(`Audit write failed for appointment ${appointmentId}`, err);
    }
  }

  // ── Core CRUD ─────────────────────────────────────────────────────────────

  /**
   * Advanced paginated list with filtering, sorting, and soft-delete awareness.
   */
  async findAll(query: AppointmentQueryDto): Promise<PaginatedResponse<Appointment>> {
    const {
      search,
      status,
      dateFrom,
      dateTo,
      patientId,
      includeDeleted,
      sortBy = 'appointmentId',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = query;

    const showDeleted = includeDeleted === true || includeDeleted === 'true';

    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'p')
      .skip((page - 1) * limit)
      .take(limit);

    // Soft-delete filter
    if (!showDeleted) {
      qb.andWhere('a.isDeleted = :deleted', { deleted: false });
    }

    // Full-text search
    if (search?.trim()) {
      qb.andWhere(
        `(a.reason LIKE :q OR p.firstName LIKE :q OR p.lastName LIKE :q)`,
        { q: `%${search.trim()}%` },
      );
    }

    // Status filter
    if (status) {
      qb.andWhere('a.status = :status', { status });
    }

    // Date range
    if (dateFrom) {
      qb.andWhere('a.appointmentDate >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('a.appointmentDate <= :dateTo', { dateTo });
    }

    // Patient filter
    if (patientId) {
      qb.andWhere('a.patientId = :patientId', { patientId });
    }

    // Sorting
    const sortCol = SORT_COLUMN_MAP[sortBy] ?? 'a.appointmentId';
    qb.orderBy(sortCol, sortOrder);

    const [data, total] = await qb.getManyAndCount();

    this.logger.log(
      `findAll → ${data.length}/${total} appointments (page ${page}, limit ${limit})`,
    );

    return PaginatedResponse.of(data, total, page, limit);
  }

  /**
   * Get a single active appointment by ID.
   */
  async findOne(id: number): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointmentId: id, isDeleted: false },
      relations: ['patient'],
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment;
  }

  /**
   * Create a new appointment with audit.
   */
  async create(dto: CreateAppointmentDto, actorId?: number): Promise<Appointment> {
    this.validateAppointmentDateNotPast(dto.appointmentDate);
    const now = new Date();

    const appointment = this.appointmentRepo.create({
      ...dto,
      status: dto.status || 'Scheduled',
      createdAt: now,
      updatedAt: now,
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });

    const saved = await this.appointmentRepo.save(appointment);

    // Re-fetch with patient relation
    const full = await this.findOne(saved.appointmentId);

    await this.writeAudit(saved.appointmentId, 'CREATE', full, actorId ?? null);

    this.logger.log(`Created appointment ID ${saved.appointmentId} by user ${actorId}`);
    return full;
  }

  /**
   * Update an appointment with diff tracking and audit.
   */
  async update(
    id: number,
    dto: UpdateAppointmentDto,
    actorId?: number,
  ): Promise<Appointment> {
    this.validateAppointmentDateNotPast(dto.appointmentDate);

    const appointment = await this.findOne(id);

    const before = { ...appointment };
    Object.assign(appointment, dto);
    appointment.updatedAt = new Date();
    appointment.updatedBy = actorId ?? null;

    const updated = await this.appointmentRepo.save(appointment);

    // Re-fetch with patient relation
    const full = await this.findOne(updated.appointmentId);

    const diff = this.buildDiff(before, full);
    await this.writeAudit(id, 'UPDATE', full, actorId ?? null, diff);

    this.logger.log(`Updated appointment ID ${id} by user ${actorId}`);
    return full;
  }

  /**
   * Soft-delete an appointment (sets is_deleted = true, records who deleted it).
   */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    const appointment = await this.findOne(id);

    const snapshot = { ...appointment };

    appointment.isDeleted = true;
    appointment.deletedAt = new Date();
    appointment.deletedBy = actorId ?? null;
    appointment.updatedBy = actorId ?? null;

    await this.appointmentRepo.save(appointment);

    await this.writeAudit(id, 'DELETE', snapshot as Appointment, actorId ?? null);

    this.logger.log(`Soft-deleted appointment ID ${id} by user ${actorId}`);
    return { message: `Appointment ${id} archived successfully` };
  }

  /**
   * Restore a soft-deleted appointment.
   */
  async restore(id: number, actorId?: number): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointmentId: id, isDeleted: true },
      relations: ['patient'],
    });

    if (!appointment) {
      throw new NotFoundException(`No archived appointment found with ID ${id}`);
    }

    appointment.isDeleted = false;
    appointment.deletedAt = null;
    appointment.deletedBy = null;
    appointment.updatedBy = actorId ?? null;

    const restored = await this.appointmentRepo.save(appointment);

    await this.writeAudit(id, 'UPDATE', restored, actorId ?? null, {
      isDeleted: { from: true, to: false },
    });

    this.logger.log(`Restored appointment ID ${id} by user ${actorId}`);
    return restored;
  }

  // ── Audit ─────────────────────────────────────────────────────────────────

  /**
   * Get the full audit history for an appointment, newest first.
   */
  async getAuditHistory(appointmentId: number): Promise<AppointmentAudit[]> {
    const exists = await this.appointmentRepo.findOne({
      where: { appointmentId },
    });

    if (!exists) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    return this.auditRepo.find({
      where: { appointmentId },
      order: { changedAt: 'DESC' },
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * Quick summary counts for the dashboard.
   */
  async getStats(): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    todayCount: number;
  }> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const [total, scheduled, completed, cancelled, todayCount] = await Promise.all([
      this.appointmentRepo.count({ where: { isDeleted: false } }),
      this.appointmentRepo.count({ where: { isDeleted: false, status: 'Scheduled' } }),
      this.appointmentRepo.count({ where: { isDeleted: false, status: 'Completed' } }),
      this.appointmentRepo.count({ where: { isDeleted: false, status: 'Cancelled' } }),
      this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.appointmentDate = :today', { today: todayStr })
        .andWhere('a.isDeleted = :deleted', { deleted: false })
        .getCount(),
    ]);

    return { total, scheduled, completed, cancelled, todayCount };
  }
}
