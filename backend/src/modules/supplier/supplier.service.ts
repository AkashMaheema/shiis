import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Supplier } from './supplier.entity';
import { SupplierAudit, AuditAction } from './supplier-audit.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';
import { PaginatedResponse } from '../../common/dto/paginated-response.dto';

// Column name map: DTO field → DB column alias used in QueryBuilder
const SORT_COLUMN_MAP: Record<string, string> = {
  name: 's.name',
  city: 's.city',
  country: 's.country',
  createdAt: 's.created_at',
  supplierId: 's.supplier_id',
};

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,

    @InjectRepository(SupplierAudit)
    private readonly auditRepo: Repository<SupplierAudit>,

    private readonly dataSource: DataSource,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Build a diff object showing what changed between two supplier snapshots.
   * Returns null when nothing changed.
   */
  private buildDiff(
    before: Partial<Supplier>,
    after: Partial<Supplier>,
  ): Record<string, { from: unknown; to: unknown }> | null {
    const tracked: (keyof Supplier)[] = [
      'name',
      'contactPerson',
      'phone',
      'email',
      'address',
      'city',
      'country',
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

  /** Write a row to SupplierAudit. Never throws — audit failures are logged only. */
  private async writeAudit(
    supplierId: number,
    action: AuditAction,
    snapshot: Supplier,
    changedBy: number | null,
    diff?: Record<string, { from: unknown; to: unknown }> | null,
  ): Promise<void> {
    try {
      const entry = this.auditRepo.create({
        supplierId,
        action,
        changedBy,
        snapshot: JSON.stringify(snapshot),
        diff: diff ? JSON.stringify(diff) : null,
      });
      await this.auditRepo.save(entry);
    } catch (err) {
      this.logger.error(`Audit write failed for supplier ${supplierId}`, err);
    }
  }

  // ── Core CRUD ─────────────────────────────────────────────────────────────

  /**
   * Advanced paginated list with filtering, sorting, and soft-delete awareness.
   */
  async findAll(query: SupplierQueryDto): Promise<PaginatedResponse<Supplier>> {
    const {
      search,
      city,
      country,
      includeDeleted,
      sortBy = 'supplierId',
      sortOrder = 'ASC',
      page = 1,
      limit = 20,
    } = query;

    const showDeleted = includeDeleted === true || includeDeleted === 'true';

    const qb = this.supplierRepo
      .createQueryBuilder('s')
      .skip((page - 1) * limit)
      .take(limit);

    // Soft-delete filter
    if (!showDeleted) {
      qb.andWhere('s.is_deleted = :deleted', { deleted: false });
    }

    // Full-text search
    if (search?.trim()) {
      qb.andWhere(
        `(s.name LIKE :q OR s.contact_person LIKE :q OR s.email LIKE :q OR s.phone LIKE :q)`,
        { q: `%${search.trim()}%` },
      );
    }

    // City filter
    if (city) {
      qb.andWhere('s.city = :city', { city });
    }

    // Country filter
    if (country) {
      qb.andWhere('s.country = :country', { country });
    }

    // Sorting
    const sortCol = SORT_COLUMN_MAP[sortBy] ?? 's.supplier_id';
    qb.orderBy(sortCol, sortOrder);

    const [data, total] = await qb.getManyAndCount();

    this.logger.log(
      `findAll → ${data.length}/${total} suppliers (page ${page}, limit ${limit})`,
    );

    return PaginatedResponse.of(data, total, page, limit);
  }

  /**
   * Get a single active supplier by ID.
   */
  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({
      where: { supplierId: id, isDeleted: false },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  /**
   * Check for a likely duplicate (same name + phone, not deleted).
   * Returns the existing supplier or null.
   */
  async findDuplicate(
    name: string,
    phone?: string,
    excludeId?: number,
  ): Promise<Supplier | null> {
    if (!phone) return null;

    const qb = this.supplierRepo
      .createQueryBuilder('s')
      .where('s.name = :name', { name })
      .andWhere('s.phone = :phone', { phone })
      .andWhere('s.is_deleted = :deleted', { deleted: false });

    if (excludeId) {
      qb.andWhere('s.supplier_id != :excludeId', { excludeId });
    }

    return qb.getOne();
  }

  /**
   * Create a new supplier via sp_UpsertSupplier stored procedure.
   */
  async create(dto: CreateSupplierDto, actorId?: number): Promise<Supplier> {
    // Duplicate check (name + phone combo)
    if (dto.phone) {
      const duplicate = await this.findDuplicate(dto.name, dto.phone);
      if (duplicate) {
        throw new ConflictException(
          `A supplier named "${dto.name}" with phone ${dto.phone} already exists (ID: ${duplicate.supplierId}). ` +
            `If this is a different supplier, please verify the details.`,
        );
      }
    }

    // Call stored procedure for INSERT
    const result = await this.dataSource.query<{ newSupplierId: number }[]>(
      `EXEC sp_UpsertSupplier
        @supplierId    = NULL,
        @name          = @0,
        @contactPerson = @1,
        @phone         = @2,
        @email         = @3,
        @address       = @4,
        @city          = @5,
        @country       = @6,
        @actorId       = @7`,
      [
        dto.name,
        dto.contactPerson ?? null,
        dto.phone ?? null,
        dto.email ?? null,
        dto.address ?? null,
        dto.city ?? null,
        dto.country ?? null,
        actorId ?? null,
      ],
    );

    const newId = result[0]?.newSupplierId;
    const saved = await this.supplierRepo.findOne({
      where: { supplierId: newId },
    });

    if (!saved) {
      throw new NotFoundException(`Failed to retrieve created supplier (ID: ${newId})`);
    }

    await this.writeAudit(newId, 'CREATE', saved, actorId ?? null);

    this.logger.log(`Created supplier ID ${newId} by user ${actorId}`);
    return saved;
  }

  /**
   * Update a supplier via sp_UpsertSupplier stored procedure, with diff tracking and audit.
   */
  async update(
    id: number,
    dto: UpdateSupplierDto,
    actorId?: number,
  ): Promise<Supplier> {
    const supplier = await this.findOne(id);

    // Duplicate check (exclude self)
    if (dto.name || dto.phone) {
      const duplicate = await this.findDuplicate(
        dto.name ?? supplier.name,
        dto.phone ?? supplier.phone,
        id,
      );

      if (duplicate) {
        throw new ConflictException(
          `Another supplier named "${dto.name ?? supplier.name}" with phone ${dto.phone ?? supplier.phone} ` +
            `already exists (ID: ${duplicate.supplierId}).`,
        );
      }
    }

    const before = { ...supplier };

    // Call stored procedure for UPDATE
    await this.dataSource.query(
      `EXEC sp_UpsertSupplier
        @supplierId    = @0,
        @name          = @1,
        @contactPerson = @2,
        @phone         = @3,
        @email         = @4,
        @address       = @5,
        @city          = @6,
        @country       = @7,
        @actorId       = @8`,
      [
        id,
        dto.name ?? supplier.name,
        dto.contactPerson ?? supplier.contactPerson ?? null,
        dto.phone ?? supplier.phone ?? null,
        dto.email ?? supplier.email ?? null,
        dto.address ?? supplier.address ?? null,
        dto.city ?? supplier.city ?? null,
        dto.country ?? supplier.country ?? null,
        actorId ?? null,
      ],
    );

    const updated = await this.supplierRepo.findOne({
      where: { supplierId: id },
    });

    if (!updated) {
      throw new NotFoundException(`Supplier with ID ${id} not found after update`);
    }

    const diff = this.buildDiff(before, updated);
    await this.writeAudit(id, 'UPDATE', updated, actorId ?? null, diff);

    this.logger.log(`Updated supplier ID ${id} by user ${actorId}`);
    return updated;
  }

  /**
   * Soft-delete a supplier (sets is_deleted = true, records who deleted it).
   */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    const supplier = await this.findOne(id);

    const snapshot = { ...supplier };

    supplier.isDeleted = true;
    supplier.deletedAt = new Date();
    supplier.deletedBy = actorId ?? null;
    supplier.updatedBy = actorId ?? null;

    await this.supplierRepo.save(supplier);

    await this.writeAudit(id, 'DELETE', snapshot as Supplier, actorId ?? null);

    this.logger.log(`Soft-deleted supplier ID ${id} by user ${actorId}`);
    return { message: `Supplier ${id} archived successfully` };
  }

  /**
   * Restore a soft-deleted supplier.
   */
  async restore(id: number, actorId?: number): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({
      where: { supplierId: id, isDeleted: true },
    });

    if (!supplier) {
      throw new NotFoundException(`No archived supplier found with ID ${id}`);
    }

    supplier.isDeleted = false;
    supplier.deletedAt = null;
    supplier.deletedBy = null;
    supplier.updatedBy = actorId ?? null;

    const restored = await this.supplierRepo.save(supplier);

    await this.writeAudit(id, 'UPDATE', restored, actorId ?? null, {
      isDeleted: { from: true, to: false },
    });

    this.logger.log(`Restored supplier ID ${id} by user ${actorId}`);
    return restored;
  }

  // ── Audit ─────────────────────────────────────────────────────────────────

  /**
   * Get the full audit history for a supplier, newest first.
   */
  async getAuditHistory(supplierId: number): Promise<SupplierAudit[]> {
    // Verify supplier exists (active or deleted)
    const exists = await this.supplierRepo.findOne({
      where: { supplierId },
    });

    if (!exists) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    return this.auditRepo.find({
      where: { supplierId },
      order: { changedAt: 'DESC' },
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * Quick summary counts via sp_GetSupplierStats stored procedure.
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    archived: number;
    addedThisMonth: number;
  }> {
    const result = await this.dataSource.query<
      { total: number; active: number; archived: number; addedThisMonth: number }[]
    >('EXEC sp_GetSupplierStats');

    return result[0] ?? { total: 0, active: 0, archived: 0, addedThisMonth: 0 };
  }
}
