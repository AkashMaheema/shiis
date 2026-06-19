import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto';
import { ReceiveOrderDto } from './dto/receive-order.dto';
import { PaginatedResponse } from '../../common/dto/paginated-response.dto';

const SORT_COLUMN_MAP: Record<string, string> = {
  poId: 'po.poId',
  orderDate: 'po.orderDate',
  status: 'po.status',
  totalAmount: 'po.totalAmount',
  createdAt: 'po.createdAt',
};

@Injectable()
export class StockInService {
  private readonly logger = new Logger(StockInService.name);

  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,

    @InjectRepository(PurchaseOrderItem)
    private readonly itemRepo: Repository<PurchaseOrderItem>,

    private readonly dataSource: DataSource,
  ) {}

  // ── List ──────────────────────────────────────────────────────────────────

  async findAll(query: PurchaseOrderQueryDto): Promise<PaginatedResponse<PurchaseOrder>> {
    const {
      search,
      status,
      supplierId,
      dateFrom,
      dateTo,
      includeDeleted,
      sortBy = 'poId',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = query;

    const showDeleted = includeDeleted === true || includeDeleted === 'true';

    const qb = this.poRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.items', 'items')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .skip((page - 1) * limit)
      .take(limit);

    if (!showDeleted) {
      qb.andWhere('po.isDeleted = :del', { del: false });
    }

    if (status) {
      qb.andWhere('po.status = :status', { status });
    }

    if (supplierId) {
      qb.andWhere('po.supplierId = :supplierId', { supplierId });
    }

    if (search?.trim()) {
      qb.andWhere('po.notes LIKE :q', { q: `%${search.trim()}%` });
    }

    if (dateFrom) {
      qb.andWhere('po.orderDate >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('po.orderDate <= :dateTo', { dateTo });
    }

    const sortCol = SORT_COLUMN_MAP[sortBy] ?? 'po.poId';
    qb.orderBy(sortCol, sortOrder);

    const [data, total] = await qb.getManyAndCount();

    this.logger.log(`findAll → ${data.length}/${total} POs (page ${page})`);
    return PaginatedResponse.of(data, total, page, limit);
  }

  // ── Single ────────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<PurchaseOrder> {
    const po = await this.poRepo.findOne({
      where: { poId: id, isDeleted: false },
      relations: ['items', 'supplier'],
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order #${id} not found`);
    }

    return po;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreatePurchaseOrderDto, actorId?: number): Promise<PurchaseOrder> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    // Calculate total
    const totalAmount = dto.items.reduce(
      (sum, i) => sum + (i.costPrice ?? 0) * i.quantity,
      0,
    );

    // Call stored procedure for header
    const result = await this.dataSource.query<{ newPoId: number }[]>(
      `EXEC sp_CreatePurchaseOrder
        @supplierId  = @0,
        @orderDate   = @1,
        @notes       = @2,
        @status      = @3,
        @totalAmount = @4,
        @actorId     = @5`,
      [
        dto.supplierId,
        dto.orderDate ?? null,
        dto.notes ?? null,
        dto.status ?? 'Draft',
        totalAmount,
        actorId ?? null,
      ],
    );

    const newPoId = result[0]?.newPoId;
    if (!newPoId) throw new BadRequestException('Failed to create purchase order');

    // Insert items via raw INSERT to avoid DeepPartial FK conflict
    for (const item of dto.items) {
      await this.dataSource.query(
        `INSERT INTO Purchase_Order_Item (po_id, medicine_id, quantity, cost_price, notes, received_qty)
         VALUES (@0, @1, @2, @3, @4, 0)`,
        [
          newPoId,
          item.medicineId,
          item.quantity,
          item.costPrice ?? null,
          item.notes ?? null,
        ],
      );
    }

    this.logger.log(`Created PO #${newPoId} by user ${actorId}`);
    return this.findOne(newPoId);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdatePurchaseOrderDto, actorId?: number): Promise<PurchaseOrder> {
    const po = await this.findOne(id);

    if (po.status === 'Received' || po.status === 'Cancelled') {
      throw new BadRequestException(`Cannot edit a ${po.status} order`);
    }

    const totalAmount = dto.items
      ? dto.items.reduce((sum, i) => sum + (i.costPrice ?? 0) * i.quantity, 0)
      : po.totalAmount;

    Object.assign(po, {
      supplierId: dto.supplierId ?? po.supplierId,
      orderDate: dto.orderDate ? new Date(dto.orderDate) : po.orderDate,
      notes: dto.notes ?? po.notes,
      status: dto.status ?? po.status,
      totalAmount,
      updatedBy: actorId ?? null,
    });

    await this.poRepo.save(po);

    // Replace items if provided
    if (dto.items && dto.items.length > 0) {
      // Replace items via raw INSERT
      await this.itemRepo.delete({ poId: id });
      for (const item of dto.items) {
        await this.dataSource.query(
          `INSERT INTO Purchase_Order_Item (po_id, medicine_id, quantity, cost_price, notes, received_qty)
           VALUES (@0, @1, @2, @3, @4, 0)`,
          [
            id,
            item.medicineId,
            item.quantity,
            item.costPrice ?? null,
            item.notes ?? null,
          ],
        );
      }
    }

    this.logger.log(`Updated PO #${id} by user ${actorId}`);
    return this.findOne(id);
  }

  // ── Receive ───────────────────────────────────────────────────────────────

  /**
   * Processes stock receipt for each item in the DTO.
   * Calls sp_ReceivePurchaseOrder per item — each call is transactional.
   * Updates PO status to Received when done.
   */
  async receive(id: number, dto: ReceiveOrderDto, actorId?: number): Promise<PurchaseOrder> {
    const po = await this.findOne(id);

    if (po.status === 'Received') {
      throw new BadRequestException('This order has already been received');
    }

    if (po.status === 'Cancelled') {
      throw new BadRequestException('Cannot receive a cancelled order');
    }

    // Process each item via stored procedure
    for (const item of dto.items) {
      if (item.receivedQty <= 0) continue;

      await this.dataSource.query(
        `EXEC sp_ReceivePurchaseOrder
          @poId        = @0,
          @poItemId    = @1,
          @medicineId  = @2,
          @receivedQty = @3,
          @batchNo     = @4,
          @expiryDate  = @5,
          @costPrice   = @6,
          @actorId     = @7`,
        [
          id,
          item.poItemId,
          item.medicineId,
          item.receivedQty,
          item.batchNo ?? null,
          item.expiryDate ?? null,
          item.costPrice ?? null,
          actorId ?? null,
        ],
      );
    }

    // Mark PO as Received
    await this.poRepo.update({ poId: id }, { status: 'Received', updatedBy: actorId ?? null });

    this.logger.log(`Received PO #${id} by user ${actorId}`);
    return this.findOne(id);
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancel(id: number, actorId?: number): Promise<PurchaseOrder> {
    const po = await this.findOne(id);

    if (po.status === 'Received') {
      throw new BadRequestException('Cannot cancel a received order');
    }

    await this.dataSource.query(
      `EXEC sp_CancelPurchaseOrder @poId = @0, @actorId = @1`,
      [id, actorId ?? null],
    );

    this.logger.log(`Cancelled PO #${id} by user ${actorId}`);
    return this.findOne(id);
  }

  // ── Soft Delete ───────────────────────────────────────────────────────────

  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    const po = await this.findOne(id);

    if (po.status === 'Received') {
      throw new BadRequestException('Cannot delete a received order');
    }

    po.isDeleted = true;
    po.deletedAt = new Date();
    po.deletedBy = actorId ?? null;
    po.updatedBy = actorId ?? null;

    await this.poRepo.save(po);
    this.logger.log(`Soft-deleted PO #${id} by user ${actorId}`);
    return { message: `Purchase Order #${id} deleted successfully` };
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(): Promise<{
    total: number;
    draft: number;
    pending: number;
    received: number;
    cancelled: number;
  }> {
    const result = await this.dataSource.query<
      { total: number; draft: number; pending: number; received: number; cancelled: number }[]
    >('EXEC sp_GetPurchaseOrderStats');

    return result[0] ?? { total: 0, draft: 0, pending: 0, received: 0, cancelled: 0 };
  }

  // ── Batches for a PO ─────────────────────────────────────────────────────

  /**
   * Returns all Medicine_Batch rows linked to medicines in this PO.
   * Used by the Batches tab on the detail page.
   */
  async getBatches(id: number): Promise<any[]> {
    await this.findOne(id); // verify exists

    const rows = await this.dataSource.query<any[]>(
      `SELECT
          mb.batch_id   AS batchId,
          mb.medicine_id AS medicineId,
          m.name         AS medicineName,
          mb.batch_no    AS batchNo,
          mb.expiry_date AS expiryDate,
          mb.quantity,
          mb.cost_price  AS costPrice,
          mb.created_at  AS createdAt,
          mb.is_active   AS isActive
       FROM Medicine_Batch mb
       JOIN Medicine m ON mb.medicine_id = m.medicine_id
       WHERE mb.po_id = @0
       ORDER BY mb.expiry_date ASC`,
      [id],
    );

    return rows;
  }
}
