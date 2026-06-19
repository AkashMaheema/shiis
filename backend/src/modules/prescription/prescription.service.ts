import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/dto/paginated-response.dto';
import { Prescription } from './prescription.entity';
import { PrescriptionItem } from './prescription-item.entity';
import { Medicine } from './medicine.entity';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import { PrescriptionQueryDto } from './dto/prescription-query.dto';

const SORT_COLUMN_MAP: Record<string, string> = {
  prescriptionId: 'rx.prescriptionId',
  issuedDate: 'rx.issuedDate',
  appointmentId: 'rx.appointmentId',
};

@Injectable()
export class PrescriptionService {
  private readonly logger = new Logger(PrescriptionService.name);

  constructor(
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PrescriptionItem)
    private readonly itemRepo: Repository<PrescriptionItem>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private async hydrate(prescriptions: Prescription[]): Promise<any[]> {
    if (prescriptions.length === 0) return [];
    return Promise.all(
      prescriptions.map(async (prescription) => {
        const rows: any[] = await this.dataSource.query(
          `SELECT
              rx.prescription_id AS prescriptionId,
              rx.appointment_id AS appointmentId,
              rx.issued_date AS issuedDate,
              rx.notes,
              a.patient_id AS patientId,
              a.doctor_id AS doctorId,
              a.appointment_date AS appointmentDate,
              a.reason,
              p.first_name AS patientFirstName,
              p.last_name AS patientLastName,
              p.phone AS patientPhone,
              d.first_name AS doctorFirstName,
              d.last_name AS doctorLastName,
              COUNT(pi.item_id) AS itemCount,
              COALESCE(SUM(COALESCE(pi.quantity, 1) * COALESCE(m.unit_price, 0)), 0) AS medicineTotal
           FROM [Prescription] rx
           LEFT JOIN [Appointment] a ON a.appointment_id = rx.appointment_id
           LEFT JOIN [Patient] p ON p.patient_id = a.patient_id
           LEFT JOIN [Doctor] d ON d.doctor_id = a.doctor_id
           LEFT JOIN [Prescription_Item] pi ON pi.prescription_id = rx.prescription_id
           LEFT JOIN [Medicine] m ON m.medicine_id = pi.medicine_id
          WHERE rx.prescription_id = @0
          GROUP BY rx.prescription_id, rx.appointment_id, rx.issued_date, rx.notes,
                   a.patient_id, a.doctor_id, a.appointment_date, a.reason,
                   p.first_name, p.last_name, p.phone, d.first_name, d.last_name`,
          [prescription.prescriptionId],
        );
        const summary = rows[0] ?? {};
        return {
          ...prescription,
          patient: summary.patientId
            ? {
                patientId: Number(summary.patientId),
                firstName: summary.patientFirstName,
                lastName: summary.patientLastName,
                phone: summary.patientPhone,
              }
            : null,
          doctor: summary.doctorId
            ? {
                doctorId: Number(summary.doctorId),
                firstName: summary.doctorFirstName,
                lastName: summary.doctorLastName,
              }
            : null,
          appointmentDate: summary.appointmentDate ?? null,
          reason: summary.reason ?? null,
          itemCount: Number(summary.itemCount ?? 0),
          medicineTotal: Number(summary.medicineTotal ?? 0),
        };
      }),
    );
  }

  private async assertAppointmentExists(appointmentId: number): Promise<void> {
    const [appointment] = await this.dataSource.query(
      `SELECT appointment_id FROM [Appointment]
        WHERE appointment_id = @0 AND ISNULL(is_deleted, 0) = 0`,
      [appointmentId],
    );
    if (!appointment) {
      throw new BadRequestException(`Appointment #${appointmentId} does not exist`);
    }
  }

  private async assertMedicinesExist(ids: number[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return;
    const rows: any[] = await this.dataSource.query(
      `SELECT medicine_id AS medicineId
         FROM [Medicine]
        WHERE medicine_id IN (${uniqueIds.join(',')})`,
    );
    if (rows.length !== uniqueIds.length) {
      throw new BadRequestException('One or more medicines do not exist');
    }
  }

  async findAll(query: PrescriptionQueryDto): Promise<PaginatedResponse<any>> {
    const {
      search,
      patientId,
      doctorId,
      includeDeleted,
      sortBy = 'prescriptionId',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = query;
    const showDeleted = includeDeleted === true || includeDeleted === 'true';

    const qb = this.prescriptionRepo
      .createQueryBuilder('rx')
      .leftJoinAndSelect('rx.appointment', 'a')
      .leftJoinAndSelect('rx.items', 'items')
      .leftJoinAndSelect('items.medicine', 'medicine')
      .skip((page - 1) * limit)
      .take(limit);

    if (!showDeleted) qb.andWhere('rx.isDeleted = :deleted', { deleted: false });
    if (patientId) qb.andWhere('a.patientId = :patientId', { patientId });
    if (doctorId) qb.andWhere('a.doctorId = :doctorId', { doctorId });
    if (search?.trim()) {
      qb.andWhere(
        `(
          CAST(rx.prescriptionId AS varchar) LIKE :q
          OR rx.notes LIKE :q
          OR EXISTS (
            SELECT 1 FROM [Prescription_Item] pi
            JOIN [Medicine] m ON m.medicine_id = pi.medicine_id
            WHERE pi.prescription_id = rx.prescription_id
              AND m.name LIKE :q
          )
        )`,
        { q: `%${search.trim()}%` },
      );
    }

    qb.orderBy(SORT_COLUMN_MAP[sortBy] ?? 'rx.prescriptionId', sortOrder);
    const [data, total] = await qb.getManyAndCount();
    const hydrated = await this.hydrate(data);
    return PaginatedResponse.of(hydrated, total, page, limit);
  }

  async findOne(id: number): Promise<any> {
    const prescription = await this.prescriptionRepo.findOne({
      where: { prescriptionId: id, isDeleted: false },
      relations: ['items', 'items.medicine'],
    });
    if (!prescription) throw new NotFoundException(`Prescription #${id} not found`);
    const [hydrated] = await this.hydrate([prescription]);
    return hydrated;
  }

  async create(dto: CreatePrescriptionDto, actorId?: number): Promise<any> {
    await this.assertAppointmentExists(dto.appointmentId);
    await this.assertMedicinesExist(dto.items.map((item) => item.medicineId));

    const rows: any[] = await this.dataSource.query(
      `EXEC sp_SavePrescriptionDetails @0, @1, @2, @3`,
      [
        dto.appointmentId,
        JSON.stringify(dto.items),
        dto.notes ?? null,
        actorId ?? null,
      ],
    );
    const prescriptionId = Number(rows?.[0]?.prescriptionId);
    if (!prescriptionId) throw new BadRequestException('Prescription save failed');
    this.logger.log(`Saved prescription ${prescriptionId} by user ${actorId}`);
    return this.findOne(prescriptionId);
  }

  async update(
    id: number,
    dto: UpdatePrescriptionDto,
    actorId?: number,
  ): Promise<any> {
    const current = await this.prescriptionRepo.findOne({
      where: { prescriptionId: id, isDeleted: false },
    });
    if (!current) throw new NotFoundException(`Prescription #${id} not found`);

    const appointmentId = dto.appointmentId ?? Number(current.appointmentId);
    if (!appointmentId) throw new BadRequestException('Appointment is required');
    await this.assertAppointmentExists(appointmentId);

    const items =
      dto.items ??
      (await this.itemRepo.find({ where: { prescriptionId: id } })).map((item) => ({
        medicineId: item.medicineId,
        dosage: item.dosage ?? undefined,
        quantity: item.quantity ?? 1,
      }));
    await this.assertMedicinesExist(items.map((item) => item.medicineId));

    const rows: any[] = await this.dataSource.query(
      `EXEC sp_SavePrescriptionDetails @0, @1, @2, @3, @4`,
      [
        appointmentId,
        JSON.stringify(items),
        dto.notes ?? current.notes ?? null,
        actorId ?? null,
        id,
      ],
    );
    const prescriptionId = Number(rows?.[0]?.prescriptionId ?? id);
    return this.findOne(prescriptionId);
  }

  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    const prescription = await this.prescriptionRepo.findOne({
      where: { prescriptionId: id, isDeleted: false },
    });
    if (!prescription) throw new NotFoundException(`Prescription #${id} not found`);

    prescription.isDeleted = true;
    prescription.deletedAt = new Date();
    prescription.deletedBy = actorId ?? null;
    prescription.updatedAt = new Date();
    prescription.updatedBy = actorId ?? null;
    await this.prescriptionRepo.save(prescription);

    if (prescription.appointmentId) {
      await this.dataSource.query(`EXEC sp_SyncPrescriptionBillItems @0`, [
        prescription.appointmentId,
      ]);
    }

    return { message: `Prescription ${id} archived successfully` };
  }

  async getStats(): Promise<any> {
    const rows: any[] = await this.dataSource.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN CAST(issued_date AS date) = CAST(GETDATE() AS date) THEN 1 ELSE 0 END) AS issuedToday,
        COALESCE(SUM(itemStats.itemCount), 0) AS totalItems,
        COALESCE(SUM(itemStats.medicineTotal), 0) AS medicineTotal
      FROM [Prescription] rx
      OUTER APPLY (
        SELECT COUNT(*) AS itemCount,
               SUM(COALESCE(pi.quantity, 1) * COALESCE(m.unit_price, 0)) AS medicineTotal
        FROM [Prescription_Item] pi
        JOIN [Medicine] m ON m.medicine_id = pi.medicine_id
        WHERE pi.prescription_id = rx.prescription_id
      ) itemStats
      WHERE ISNULL(rx.is_deleted, 0) = 0
    `);
    return rows[0] ?? {};
  }

  async listAppointments(): Promise<any[]> {
    const rows: any[] = await this.dataSource.query(
      `SELECT a.appointment_id AS appointmentId,
              a.patient_id AS patientId,
              a.doctor_id AS doctorId,
              a.appointment_date AS appointmentDate,
              a.reason,
              p.first_name AS patientFirstName,
              p.last_name AS patientLastName,
              d.first_name AS doctorFirstName,
              d.last_name AS doctorLastName
         FROM [Appointment] a
         JOIN [Patient] p ON p.patient_id = a.patient_id
         LEFT JOIN [Doctor] d ON d.doctor_id = a.doctor_id
        WHERE ISNULL(a.is_deleted, 0) = 0
        ORDER BY a.appointment_date DESC, a.appointment_id DESC`,
    );
    return rows.map((r) => ({
      ...r,
      appointmentId: Number(r.appointmentId),
      patientId: Number(r.patientId),
      doctorId: r.doctorId == null ? null : Number(r.doctorId),
    }));
  }

  async findOneForDoctor(id: number, doctorId?: number): Promise<any> {
    const prescription = await this.findOne(id);
    if (doctorId && Number(prescription.doctor?.doctorId) !== Number(doctorId)) {
      throw new NotFoundException(`Prescription #${id} not found`);
    }
    return prescription;
  }

  async listPatients(): Promise<any[]> {
    const rows: any[] = await this.dataSource.query(
      `SELECT patient_id AS patientId,
              first_name AS firstName,
              last_name AS lastName,
              phone
         FROM [Patient]
        WHERE ISNULL(is_deleted, 0) = 0
        ORDER BY first_name, last_name`,
    );
    return rows.map((r) => ({
      ...r,
      patientId: Number(r.patientId),
    }));
  }

  async listMedicines(search?: string): Promise<Medicine[]> {
    const qb = this.medicineRepo.createQueryBuilder('m');
    if (search?.trim()) qb.where('m.name LIKE :q', { q: `%${search.trim()}%` });
    return qb.orderBy('m.name', 'ASC').getMany();
  }
}
