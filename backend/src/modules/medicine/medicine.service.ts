import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Medicine } from './medicine.entity';
import { MedicineBatch } from './medicine-batch.entity';
import { Stock } from './stock.entity';
import { InventoryLog } from './inventory-log.entity';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { MedicineQueryDto } from './dto/medicine-query.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { PaginatedResponse } from '../../common/dto/paginated-response.dto';

// Column name map: DTO field → DB column alias used in QueryBuilder
const SORT_COLUMN_MAP: Record<string, string> = {
  name: 'm.name',
  category: 'm.category',
  unitPrice: 'm.unit_price',
  medicineId: 'm.medicine_id',
  totalQuantity: 's.total_quantity',
};

@Injectable()
export class MedicineService {
  private readonly logger = new Logger(MedicineService.name);

  constructor(
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,

    @InjectRepository(MedicineBatch)
    private readonly batchRepo: Repository<MedicineBatch>,

    @InjectRepository(Stock)
    private readonly stockRepo: Repository<Stock>,

    @InjectRepository(InventoryLog)
    private readonly logRepo: Repository<InventoryLog>,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ── Core CRUD ─────────────────────────────────────────────────────────────

  /**
   * Paginated list with stock info, filtering, and sorting.
   */
  async findAll(
    query: MedicineQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const {
      search,
      category,
      lowStockOnly,
      sortBy = 'medicineId',
      sortOrder = 'ASC',
      page = 1,
      limit = 20,
    } = query;

    const qb = this.medicineRepo
      .createQueryBuilder('m')
      .skip((page - 1) * limit)
      .take(limit);

    // Full-text search
    if (search?.trim()) {
      qb.andWhere(`(m.name LIKE :q OR m.category LIKE :q)`, {
        q: `%${search.trim()}%`,
      });
    }

    // Category filter
    if (category) {
      qb.andWhere('m.category = :category', { category });
    }

    // Sorting (skip stock-based sorting to avoid join issues)
    const sortCol =
      sortBy === 'totalQuantity'
        ? 'm.medicine_id'
        : (SORT_COLUMN_MAP[sortBy] ?? 'm.medicine_id');
    qb.orderBy(sortCol, sortOrder);

    const [medicines, total] = await qb.getManyAndCount();

    // Attach stock data separately
    if (medicines.length > 0) {
      const ids = medicines.map((m) => m.medicineId);
      const stocks = await this.stockRepo
        .createQueryBuilder('s')
        .where('s.medicine_id IN (:...ids)', { ids })
        .getMany();

      const stockMap = new Map(stocks.map((s) => [s.medicineId, s]));

      for (const m of medicines) {
        (m as any).stock = stockMap.get(m.medicineId) ?? null;
      }
    }

    // Post-filter low stock (after attaching stock data)
    let filteredData: any[] = medicines;
    let filteredTotal = total;

    if (lowStockOnly === 'true') {
      filteredData = medicines.filter((m: any) => {
        const qty = m.stock?.totalQuantity ?? 0;
        return qty <= 10;
      });
      filteredTotal = filteredData.length;
    }

    this.logger.log(
      `findAll → ${filteredData.length}/${filteredTotal} medicines (page ${page}, limit ${limit})`,
    );

    return PaginatedResponse.of(filteredData, filteredTotal, page, limit);
  }

  /**
   * Get a single medicine with stock, batches, and recent inventory logs.
   */
  async findOne(id: number): Promise<Medicine> {
    const medicine = await this.medicineRepo.findOne({
      where: { medicineId: id },
      relations: ['stock', 'batches', 'inventoryLogs'],
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine with ID ${id} not found`);
    }

    // Sort inventory logs newest first
    if (medicine.inventoryLogs) {
      medicine.inventoryLogs.sort(
        (a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime(),
      );
    }

    // Sort batches by expiry date ascending
    if (medicine.batches) {
      medicine.batches.sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return (
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        );
      });
    }

    return medicine;
  }

  /**
   * Create a new medicine and its associated Stock record.
   */
  async create(dto: CreateMedicineDto): Promise<Medicine> {
    // Duplicate check by name
    const existing = await this.medicineRepo.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `A medicine named "${dto.name}" already exists (ID: ${existing.medicineId}).`,
      );
    }

    const medicine = this.medicineRepo.create({
      name: dto.name,
      category: dto.category ?? null,
      unitPrice: dto.unitPrice ?? null,
    });

    const saved = await this.medicineRepo.save(medicine);

    // Auto-create stock record
    const stock = this.stockRepo.create({
      medicineId: saved.medicineId,
      totalQuantity: 0,
    });
    await this.stockRepo.save(stock);

    this.logger.log(`Created medicine ID ${saved.medicineId}: ${saved.name}`);
    return this.findOne(saved.medicineId);
  }

  /**
   * Update medicine details.
   */
  async update(id: number, dto: UpdateMedicineDto): Promise<Medicine> {
    const medicine = await this.medicineRepo.findOne({
      where: { medicineId: id },
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine with ID ${id} not found`);
    }

    // Duplicate check (exclude self)
    if (dto.name && dto.name !== medicine.name) {
      const dup = await this.medicineRepo.findOne({
        where: { name: dto.name },
      });
      if (dup && dup.medicineId !== id) {
        throw new ConflictException(
          `Another medicine named "${dto.name}" already exists (ID: ${dup.medicineId}).`,
        );
      }
    }

    Object.assign(medicine, dto);
    await this.medicineRepo.save(medicine);

    this.logger.log(`Updated medicine ID ${id}`);
    return this.findOne(id);
  }

  /**
   * Hard-delete a medicine (the table has no soft-delete columns).
   */
  async remove(id: number): Promise<{ message: string }> {
    const medicine = await this.medicineRepo.findOne({
      where: { medicineId: id },
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine with ID ${id} not found`);
    }

    // Delete dependent records first (logs, batches, stock)
    await this.logRepo.delete({ medicineId: id });
    await this.batchRepo.delete({ medicineId: id });
    await this.stockRepo.delete({ medicineId: id });
    await this.medicineRepo.delete(id);

    this.logger.log(`Deleted medicine ID ${id}: ${medicine.name}`);
    return { message: `Medicine "${medicine.name}" deleted successfully` };
  }

  // ── Stock Management ──────────────────────────────────────────────────────

  /**
   * Adjust stock: IN adds quantity, OUT removes quantity.
   * Creates an Inventory_Log entry and optionally a Medicine_Batch record.
   */
  async adjustStock(
    id: number,
    dto: StockAdjustmentDto,
  ): Promise<Medicine> {
    const medicine = await this.medicineRepo.findOne({
      where: { medicineId: id },
      relations: ['stock'],
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine with ID ${id} not found`);
    }

    // Ensure stock record exists
    let stock = medicine.stock;
    if (!stock) {
      stock = this.stockRepo.create({
        medicineId: id,
        totalQuantity: 0,
      });
      stock = await this.stockRepo.save(stock);
    }

    const currentQty = stock.totalQuantity ?? 0;

    if (dto.changeType === 'OUT') {
      if (dto.quantity > currentQty) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${currentQty}, Requested: ${dto.quantity}`,
        );
      }
      stock.totalQuantity = currentQty - dto.quantity;
    } else {
      stock.totalQuantity = currentQty + dto.quantity;
    }

    await this.stockRepo.save(stock);

    // Create inventory log entry
    const log = this.logRepo.create({
      medicineId: id,
      changeType: dto.changeType,
      quantity: dto.quantity,
    });
    await this.logRepo.save(log);

    // If incoming stock with batch info, create batch record
    if (dto.changeType === 'IN' && (dto.batchNo || dto.expiryDate)) {
      const batch = this.batchRepo.create({
        medicineId: id,
        batchNo: dto.batchNo ?? null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        quantity: dto.quantity,
      });
      await this.batchRepo.save(batch);
    }

    this.logger.log(
      `Stock ${dto.changeType} for medicine ID ${id}: qty=${dto.quantity}, new total=${stock.totalQuantity}`,
    );

    return this.findOne(id);
  }

  // ── Inventory Log ─────────────────────────────────────────────────────────

  /**
   * Get inventory log for a medicine, newest first.
   */
  async getInventoryLog(
    medicineId: number,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<InventoryLog>> {
    const medicine = await this.medicineRepo.findOne({
      where: { medicineId },
    });

    if (!medicine) {
      throw new NotFoundException(`Medicine with ID ${medicineId} not found`);
    }

    const [data, total] = await this.logRepo.findAndCount({
      where: { medicineId },
      order: { date: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return PaginatedResponse.of(data, total, page, limit);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * Quick summary counts for the dashboard.
   */
  async getStats(): Promise<{
    total: number;
    lowStock: number;
    outOfStock: number;
    categories: number;
  }> {
    const total = await this.medicineRepo.count();

    const lowStock = await this.stockRepo
      .createQueryBuilder('s')
      .where('s.total_quantity > 0 AND s.total_quantity <= 10')
      .getCount();

    const outOfStock = await this.stockRepo
      .createQueryBuilder('s')
      .where('s.total_quantity = 0 OR s.total_quantity IS NULL')
      .getCount();

    const categoriesResult = await this.medicineRepo
      .createQueryBuilder('m')
      .select('COUNT(DISTINCT m.category)', 'count')
      .where('m.category IS NOT NULL')
      .getRawOne();

    return {
      total,
      lowStock,
      outOfStock,
      categories: parseInt(categoriesResult?.count ?? '0', 10),
    };
  }

  async getInventoryRiskReport(
    lowStockThreshold = 10,
    expiryDays = 30,
  ): Promise<any[]> {
    return this.dataSource.query(`EXEC sp_GetInventoryRiskReport @0, @1`, [
      lowStockThreshold,
      expiryDays,
    ]);
  }

  async getLowStockMedicines(threshold = 10): Promise<any[]> {
    return this.dataSource.query(`EXEC sp_GetLowStockMedicines @0`, [
      threshold,
    ]);
  }

  async getExpiringBatches(days = 30): Promise<any[]> {
    return this.dataSource.query(`EXEC sp_GetExpiringMedicineBatches @0`, [
      days,
    ]);
  }

  async getMedicineMovementHistory(id: number): Promise<any[]> {
    await this.findOne(id);
    return this.dataSource.query(`EXEC sp_GetMedicineMovementHistory @0`, [
      id,
    ]);
  }
}
