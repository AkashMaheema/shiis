import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/dto/paginated-response.dto';
import { Bill } from './bill.entity';
import { BillItem } from './bill-item.entity';
import { Payment } from './payment.entity';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { BillingQueryDto } from './dto/billing-query.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';

const SORT_COLUMN_MAP: Record<string, string> = {
  billId: 'b.billId',
  createdDate: 'b.createdDate',
  totalAmount: 'b.totalAmount',
  status: 'b.status',
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Bill)
    private readonly billRepo: Repository<Bill>,
    @InjectRepository(BillItem)
    private readonly itemRepo: Repository<BillItem>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private toNumber(value: unknown): number {
    return Number(value ?? 0);
  }

  private computeStatus(total: number, paid: number): string {
    if (total <= 0) return 'Unpaid';
    if (paid <= 0) return 'Unpaid';
    if (paid >= total) return 'Paid';
    return 'Partially Paid';
  }

  private async attachTotals(bills: Bill[]): Promise<any[]> {
    if (bills.length === 0) return [];
    const ids = bills.map((b) => b.billId);
    const rows: any[] = await this.dataSource.query(
      `SELECT bill_id AS billId, COALESCE(SUM(amount), 0) AS paidAmount
         FROM [Payment]
        WHERE bill_id IN (${ids.join(',')})
        GROUP BY bill_id`,
    );
    const paidMap = new Map(rows.map((r) => [Number(r.billId), this.toNumber(r.paidAmount)]));

    return bills.map((bill) => {
      const totalAmount = this.toNumber(bill.totalAmount);
      const paidAmount = paidMap.get(Number(bill.billId)) ?? 0;
      return {
        ...bill,
        totalAmount,
        paidAmount,
        balanceAmount: Math.max(totalAmount - paidAmount, 0),
        status: bill.status || this.computeStatus(totalAmount, paidAmount),
      };
    });
  }

  private totalItems(dto: CreateBillDto | UpdateBillDto): number {
    return (dto.items ?? []).reduce((sum, item) => {
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? 0);
      return sum + quantity * unitPrice;
    }, 0);
  }

  private async assertPatientExists(patientId: number): Promise<void> {
    const [patient] = await this.dataSource.query(
      `SELECT patient_id FROM [Patient] WHERE patient_id = @0 AND is_deleted = 0`,
      [patientId],
    );
    if (!patient) throw new BadRequestException(`Patient #${patientId} does not exist`);
  }

  private async assertAppointmentExists(appointmentId?: number): Promise<void> {
    if (!appointmentId) return;
    const [appointment] = await this.dataSource.query(
      `SELECT appointment_id FROM [Appointment] WHERE appointment_id = @0 AND is_deleted = 0`,
      [appointmentId],
    );
    if (!appointment) {
      throw new BadRequestException(`Appointment #${appointmentId} does not exist`);
    }
  }

  async findAll(query: BillingQueryDto): Promise<PaginatedResponse<any>> {
    const {
      search,
      status,
      patientId,
      includeDeleted,
      sortBy = 'billId',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = query;

    const showDeleted = includeDeleted === true || includeDeleted === 'true';
    const qb = this.billRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.patient', 'p')
      .skip((page - 1) * limit)
      .take(limit);

    if (!showDeleted) qb.andWhere('b.isDeleted = :deleted', { deleted: false });
    if (status) qb.andWhere('b.status = :status', { status });
    if (patientId) qb.andWhere('b.patientId = :patientId', { patientId });
    if (search?.trim()) {
      qb.andWhere(
        `(CAST(b.billId AS varchar) LIKE :q OR p.firstName LIKE :q OR p.lastName LIKE :q OR p.phone LIKE :q)`,
        { q: `%${search.trim()}%` },
      );
    }

    qb.orderBy(SORT_COLUMN_MAP[sortBy] ?? 'b.billId', sortOrder);
    const [data, total] = await qb.getManyAndCount();
    const hydrated = await this.attachTotals(data);

    return PaginatedResponse.of(hydrated, total, page, limit);
  }

  async findOne(id: number): Promise<any> {
    const bill = await this.billRepo.findOne({
      where: { billId: id, isDeleted: false },
      relations: ['items', 'payments'],
    });
    if (!bill) throw new NotFoundException(`Bill #${id} not found`);
    const [hydrated] = await this.attachTotals([bill]);
    return hydrated;
  }

  async create(dto: CreateBillDto, actorId?: number): Promise<any> {
    await this.assertPatientExists(dto.patientId);
    await this.assertAppointmentExists(dto.appointmentId);

    const saved = await this.dataSource.transaction(async (manager) => {
      const totalAmount = this.totalItems(dto);
      const bill = manager.create(Bill, {
        patientId: dto.patientId,
        appointmentId: dto.appointmentId ?? null,
        totalAmount,
        createdDate: new Date(),
        status: 'Unpaid',
        notes: dto.notes ?? null,
        isDeleted: false,
        createdBy: actorId ?? null,
        updatedBy: actorId ?? null,
      });
      const created = await manager.save(bill);

      const items = dto.items.map((item) =>
        manager.create(BillItem, {
          billId: created.billId,
          description: item.description,
          quantity: Number(item.quantity ?? 1),
          unitPrice: Number(item.unitPrice),
          amount: Number(item.quantity ?? 1) * Number(item.unitPrice),
        }),
      );
      await manager.save(items);
      return created;
    });

    this.logger.log(`Created bill ID ${saved.billId} by user ${actorId}`);
    return this.findOne(saved.billId);
  }

  async update(id: number, dto: UpdateBillDto, actorId?: number): Promise<any> {
    const bill = await this.billRepo.findOne({ where: { billId: id, isDeleted: false } });
    if (!bill) throw new NotFoundException(`Bill #${id} not found`);

    if (dto.patientId !== undefined) await this.assertPatientExists(dto.patientId);
    await this.assertAppointmentExists(dto.appointmentId);

    await this.dataSource.transaction(async (manager) => {
      if (dto.patientId !== undefined) bill.patientId = dto.patientId;
      if (dto.appointmentId !== undefined) bill.appointmentId = dto.appointmentId;
      if (dto.notes !== undefined) bill.notes = dto.notes;
      bill.updatedBy = actorId ?? null;

      if (dto.items) {
        bill.totalAmount = this.totalItems(dto);
        await manager.delete(BillItem, { billId: id });
      }

      const paid = await this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'paid')
        .where('p.billId = :id', { id })
        .getRawOne();
      bill.status = this.computeStatus(this.toNumber(bill.totalAmount), this.toNumber(paid?.paid));
      await manager.save(bill);

      if (dto.items) {
        const items = dto.items.map((item) =>
          manager.create(BillItem, {
            billId: id,
            description: item.description,
            quantity: Number(item.quantity ?? 1),
            unitPrice: Number(item.unitPrice),
            amount: Number(item.quantity ?? 1) * Number(item.unitPrice),
          }),
        );
        await manager.save(items);
      }
    });

    return this.findOne(id);
  }

  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    const bill = await this.billRepo.findOne({ where: { billId: id, isDeleted: false } });
    if (!bill) throw new NotFoundException(`Bill #${id} not found`);
    bill.isDeleted = true;
    bill.deletedAt = new Date();
    bill.deletedBy = actorId ?? null;
    bill.updatedBy = actorId ?? null;
    bill.status = 'Voided';
    await this.billRepo.save(bill);
    return { message: `Bill ${id} voided successfully` };
  }

  async processPayment(
    id: number,
    dto: ProcessPaymentDto,
    actorId?: number,
  ): Promise<any> {
    const bill = await this.findOne(id);
    if (dto.amount > bill.balanceAmount) {
      throw new BadRequestException('Payment cannot exceed the outstanding balance');
    }

    await this.dataSource.query(`EXEC sp_ProcessPayment @0, @1, @2, @3`, [
      id,
      dto.paymentMethod,
      dto.amount,
      actorId ?? null,
    ]);
    return this.findOne(id);
  }

  async generateFromAppointment(
    appointmentId: number,
    actorId?: number,
  ): Promise<any> {
    await this.assertAppointmentExists(appointmentId);
    const existing = await this.billRepo.findOne({
      where: { appointmentId, isDeleted: false },
      order: { billId: 'DESC' },
    });
    if (existing) {
      await this.dataSource.query(`EXEC sp_SyncPrescriptionBillItems @0`, [
        appointmentId,
      ]);
      return this.findOne(existing.billId);
    }

    const rows: any[] = await this.dataSource.query(`EXEC sp_GenerateBill @0, @1`, [
      appointmentId,
      actorId ?? null,
    ]);
    const billId = Number(rows?.[0]?.billId);
    if (billId) return this.findOne(billId);

    const generated = await this.billRepo.findOne({
      where: { appointmentId, isDeleted: false },
      order: { billId: 'DESC' },
    });
    if (!generated) throw new BadRequestException('Bill generation failed');
    return this.findOne(generated.billId);
  }

  async getStats(): Promise<any> {
    const rows: any[] = await this.dataSource.query(`EXEC sp_GetBillingStats`);
    return rows[0] ?? {};
  }

  async listPatients(): Promise<any[]> {
    const rows: any[] = await this.dataSource.query(
      `SELECT patient_id AS patientId, first_name AS firstName, last_name AS lastName, phone
         FROM [Patient]
        WHERE is_deleted = 0
        ORDER BY first_name, last_name`,
    );
    return rows.map((r) => ({ ...r, patientId: Number(r.patientId) }));
  }

  async listAppointments(): Promise<any[]> {
    const rows: any[] = await this.dataSource.query(
      `SELECT a.appointment_id AS appointmentId,
              a.patient_id AS patientId,
              a.appointment_date AS appointmentDate,
              a.reason,
              p.first_name AS firstName,
              p.last_name AS lastName
         FROM [Appointment] a
         JOIN [Patient] p ON p.patient_id = a.patient_id
        WHERE a.is_deleted = 0
        ORDER BY a.appointment_date DESC, a.appointment_id DESC`,
    );
    return rows.map((r) => ({
      ...r,
      appointmentId: Number(r.appointmentId),
      patientId: Number(r.patientId),
    }));
  }
}
