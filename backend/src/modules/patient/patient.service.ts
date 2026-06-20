import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Patient } from './patient.entity';
import { PatientAudit, AuditAction } from './patient-audit.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';
import { PaginatedResponse } from '../../common/dto/paginated-response.dto';

// Column name map: DTO field → DB column alias used in QueryBuilder
const SORT_COLUMN_MAP: Record<string, string> = {
  firstName: 'p.first_name',
  lastName: 'p.last_name',
  dob: 'p.dob',
  createdAt: 'p.created_at',
  patientId: 'p.patient_id',
};

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,

    @InjectRepository(PatientAudit)
    private readonly auditRepo: Repository<PatientAudit>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Build a diff object showing what changed between two patient snapshots.
   * Returns null when nothing changed.
   */
  private buildDiff(
    before: Partial<Patient>,
    after: Partial<Patient>,
  ): Record<string, { from: unknown; to: unknown }> | null {
    const tracked: (keyof Patient)[] = [
      'firstName',
      'lastName',
      'dob',
      'gender',
      'phone',
      'email',
      'address',
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

  /** Write a row to PatientAudit. Never throws — audit failures are logged only. */
  private async writeAudit(
    patientId: number,
    action: AuditAction,
    snapshot: Patient,
    changedBy: number | null,
    diff?: Record<string, { from: unknown; to: unknown }> | null,
  ): Promise<void> {
    try {
      const entry = this.auditRepo.create({
        patientId,
        action,
        changedBy,
        snapshot: JSON.stringify(snapshot),
        diff: diff ? JSON.stringify(diff) : null,
      });
      await this.auditRepo.save(entry);
    } catch (err) {
      this.logger.error(`Audit write failed for patient ${patientId}`, err);
    }
  }

  // ── Core CRUD ─────────────────────────────────────────────────────────────

  /**
   * Advanced paginated list with filtering, sorting, and soft-delete awareness.
   */
  async findAll(query: PatientQueryDto): Promise<PaginatedResponse<Patient>> {
    const {
      search,
      gender,
      dobFrom,
      dobTo,
      includeDeleted,
      sortBy = 'patientId',
      sortOrder = 'ASC',
      page = 1,
      limit = 20,
    } = query;

    const showDeleted = includeDeleted === true || includeDeleted === 'true';

    const qb = this.patientRepo
      .createQueryBuilder('p')
      .skip((page - 1) * limit)
      .take(limit);

    // Soft-delete filter
    if (!showDeleted) {
      qb.andWhere('p.is_deleted = :deleted', { deleted: false });
    }

    // Full-text search
    if (search?.trim()) {
      qb.andWhere(
        `(p.first_name LIKE :q OR p.last_name LIKE :q OR p.email LIKE :q OR p.phone LIKE :q)`,
        { q: `%${search.trim()}%` },
      );
    }

    // Gender filter
    if (gender) {
      qb.andWhere('p.gender = :gender', { gender });
    }

    // DOB range
    if (dobFrom) {
      qb.andWhere('p.dob >= :dobFrom', { dobFrom });
    }
    if (dobTo) {
      qb.andWhere('p.dob <= :dobTo', { dobTo });
    }

    // Sorting
    const sortCol = SORT_COLUMN_MAP[sortBy] ?? 'p.patient_id';
    qb.orderBy(sortCol, sortOrder);

    const [data, total] = await qb.getManyAndCount();

    this.logger.log(
      `findAll → ${data.length}/${total} patients (page ${page}, limit ${limit})`,
    );

    return PaginatedResponse.of(data, total, page, limit);
  }

  /**
   * Get a single active patient by ID.
   */
  async findOne(id: number): Promise<Patient> {
    const patient = await this.patientRepo.findOne({
      where: { patientId: id, isDeleted: false },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }

  async searchWithProcedure(searchTerm: string): Promise<any[]> {
    return this.dataSource.query(`EXEC sp_SearchPatients @0`, [
      searchTerm?.trim() || '',
    ]);
  }

  async getVisitHistory(id: number): Promise<any[]> {
    await this.findOne(id);
    return this.dataSource.query(`EXEC sp_GetPatientVisitHistory @0`, [id]);
  }

  /**
   * Check for a likely duplicate (same name + DOB, not deleted).
   * Returns the existing patient or null.
   */
  async findDuplicate(
    firstName: string,
    lastName: string,
    dob: string,
    excludeId?: number,
  ): Promise<Patient | null> {
    const qb = this.patientRepo
      .createQueryBuilder('p')
      .where('p.first_name = :fn', { fn: firstName })
      .andWhere('p.last_name = :ln', { ln: lastName })
      .andWhere('p.dob = :dob', { dob })
      .andWhere('p.is_deleted = :deleted', { deleted: false });

    if (excludeId) {
      qb.andWhere('p.patient_id != :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  /**
   * Create a new patient with duplicate detection and audit.
   */
  async create(dto: CreatePatientDto, actorId?: number): Promise<Patient> {
    // Duplicate check
    const duplicate = await this.findDuplicate(
      dto.firstName,
      dto.lastName,
      dto.dob,
    );

    if (duplicate) {
      throw new ConflictException(
        `A patient named ${dto.firstName} ${dto.lastName} with DOB ${dto.dob} already exists (ID: ${duplicate.patientId}). ` +
          `If this is a different person, please verify the details.`,
      );
    }

    const patient = this.patientRepo.create({
      ...dto,
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });

    const saved = await this.patientRepo.save(patient);

    await this.writeAudit(saved.patientId, 'CREATE', saved, actorId ?? null);

    this.logger.log(`Created patient ID ${saved.patientId} by user ${actorId}`);
    return saved;
  }

  /**
   * Update a patient with diff tracking and audit.
   */
  async update(
    id: number,
    dto: UpdatePatientDto,
    actorId?: number,
  ): Promise<Patient> {
    const patient = await this.findOne(id);

    // Duplicate check (exclude self)
    if (dto.firstName || dto.lastName || dto.dob) {
      const duplicate = await this.findDuplicate(
        dto.firstName ?? patient.firstName,
        dto.lastName ?? patient.lastName,
        dto.dob ?? String(patient.dob),
        id,
      );

      if (duplicate) {
        throw new ConflictException(
          `Another patient named ${dto.firstName ?? patient.firstName} ${dto.lastName ?? patient.lastName} ` +
            `with DOB ${dto.dob ?? patient.dob} already exists (ID: ${duplicate.patientId}).`,
        );
      }
    }

    const before = { ...patient };
    Object.assign(patient, dto);
    patient.updatedBy = actorId ?? null;

    const updated = await this.patientRepo.save(patient);

    const diff = this.buildDiff(before, updated);
    await this.writeAudit(id, 'UPDATE', updated, actorId ?? null, diff);

    this.logger.log(`Updated patient ID ${id} by user ${actorId}`);
    return updated;
  }

  /**
   * Soft-delete a patient (sets is_deleted = true, records who deleted it).
   */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    const patient = await this.findOne(id);

    const snapshot = { ...patient };

    patient.isDeleted = true;
    patient.deletedAt = new Date();
    patient.deletedBy = actorId ?? null;
    patient.updatedBy = actorId ?? null;

    await this.patientRepo.save(patient);

    await this.writeAudit(id, 'DELETE', snapshot as Patient, actorId ?? null);

    this.logger.log(`Soft-deleted patient ID ${id} by user ${actorId}`);
    return { message: `Patient ${id} archived successfully` };
  }

  /**
   * Restore a soft-deleted patient.
   */
  async restore(id: number, actorId?: number): Promise<Patient> {
    const patient = await this.patientRepo.findOne({
      where: { patientId: id, isDeleted: true },
    });

    if (!patient) {
      throw new NotFoundException(`No archived patient found with ID ${id}`);
    }

    patient.isDeleted = false;
    patient.deletedAt = null;
    patient.deletedBy = null;
    patient.updatedBy = actorId ?? null;

    const restored = await this.patientRepo.save(patient);

    await this.writeAudit(id, 'UPDATE', restored, actorId ?? null, {
      isDeleted: { from: true, to: false },
    });

    this.logger.log(`Restored patient ID ${id} by user ${actorId}`);
    return restored;
  }

  // ── Audit ─────────────────────────────────────────────────────────────────

  /**
   * Get the full audit history for a patient, newest first.
   */
  async getAuditHistory(patientId: number): Promise<PatientAudit[]> {
    // Verify patient exists (active or deleted)
    const exists = await this.patientRepo.findOne({
      where: { patientId },
    });

    if (!exists) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    return this.auditRepo.find({
      where: { patientId },
      order: { changedAt: 'DESC' },
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * Quick summary counts for the dashboard.
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    archived: number;
    addedThisMonth: number;
  }> {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, active, archived, addedThisMonth] = await Promise.all([
      this.patientRepo.count(),
      this.patientRepo.count({ where: { isDeleted: false } }),
      this.patientRepo.count({ where: { isDeleted: true } }),
      this.patientRepo
        .createQueryBuilder('p')
        .where('p.created_at >= :from', { from: firstOfMonth })
        .andWhere('p.is_deleted = :deleted', { deleted: false })
        .getCount(),
    ]);

    return { total, active, archived, addedThisMonth };
  }
}
