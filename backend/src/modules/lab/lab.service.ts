import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LabTest } from './lab-test.entity';
import { LabRequest } from './lab-request.entity';
import { LabResult } from './lab-result.entity';
import {
  CreateLabTestDto,
  UpdateLabTestDto,
} from './dto/lab-test.dto';
import {
  CreateLabRequestDto,
  LabRequestQueryDto,
  UpdateLabRequestDto,
} from './dto/lab-request.dto';
import {
  CreateLabResultDto,
  UpdateLabResultDto,
} from './dto/lab-result.dto';
import { PaginatedResponse } from '../../common/dto/paginated-response.dto';

const SORT_COLUMN_MAP: Record<string, string> = {
  requestId: 'r.requestId',
  requestDate: 'r.requestDate',
  patientId: 'r.patientId',
};

@Injectable()
export class LabService {
  private readonly logger = new Logger(LabService.name);

  constructor(
    @InjectRepository(LabTest)
    private readonly labTestRepo: Repository<LabTest>,
    @InjectRepository(LabRequest)
    private readonly labRequestRepo: Repository<LabRequest>,
    @InjectRepository(LabResult)
    private readonly labResultRepo: Repository<LabResult>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // ───────────────────────────── Lab Test (catalog) ─────────────────────────

  async findAllTests(search?: string): Promise<LabTest[]> {
    const qb = this.labTestRepo.createQueryBuilder('t');
    if (search?.trim()) {
      qb.where('t.testName LIKE :q', { q: `%${search.trim()}%` });
    }
    return qb.orderBy('t.testId', 'DESC').getMany();
  }

  async findOneTest(id: number): Promise<LabTest> {
    const test = await this.labTestRepo.findOne({ where: { testId: id } });
    if (!test) throw new NotFoundException(`Lab test #${id} not found`);
    return test;
  }

  async createTest(dto: CreateLabTestDto): Promise<LabTest> {
    const test = this.labTestRepo.create({
      testName: dto.testName,
      price: dto.price ?? null,
    } as Partial<LabTest>);
    return this.labTestRepo.save(test);
  }

  async updateTest(id: number, dto: UpdateLabTestDto): Promise<LabTest> {
    const test = await this.findOneTest(id);
    Object.assign(test, dto);
    return this.labTestRepo.save(test);
  }

  async removeTest(id: number): Promise<{ message: string }> {
    const test = await this.findOneTest(id);
    // Block delete if referenced
    const inUse = await this.labRequestRepo.count({ where: { testId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete test — referenced by ${inUse} request(s).`,
      );
    }
    await this.labTestRepo.remove(test);
    return { message: `Lab test ${id} deleted` };
  }

  // ───────────────────────────── Helpers ────────────────────────────────────

  /** Hydrate one or many requests with patient + doctor + result via raw join. */
  private async hydrate(
    requests: LabRequest[],
  ): Promise<any[]> {
    if (requests.length === 0) return [];

    const ids = requests.map((r) => r.requestId);
    const patientIds = [...new Set(requests.map((r) => r.patientId).filter(Boolean))] as number[];
    const doctorIds = [...new Set(requests.map((r) => r.doctorId).filter(Boolean))] as number[];

    const patientRows: any[] = patientIds.length
      ? await this.dataSource.query(
          `SELECT patient_id AS patientId, first_name AS firstName, last_name AS lastName, phone, email
           FROM [Patient] WHERE patient_id IN (${patientIds.join(',')})`,
        )
      : [];

    const doctorRows: any[] = doctorIds.length
      ? await this.dataSource.query(
          `SELECT doctor_id AS doctorId, first_name AS firstName, last_name AS lastName, phone, email
           FROM [Doctor] WHERE doctor_id IN (${doctorIds.join(',')})`,
        )
      : [];

    const resultRows = await this.labResultRepo
      .createQueryBuilder('res')
      .where('res.requestId IN (:...ids)', { ids })
      .getMany();

    // Normalize keys to numbers — raw-SQL ints can come back as strings
    const patientMap = new Map(
      patientRows.map((p) => [Number(p.patientId), { ...p, patientId: Number(p.patientId) }]),
    );
    const doctorMap = new Map(
      doctorRows.map((d) => [Number(d.doctorId), { ...d, doctorId: Number(d.doctorId) }]),
    );
    const resultMap = new Map(resultRows.map((r) => [Number(r.requestId), r]));

    return requests.map((r) => ({
      ...r,
      patient: r.patientId ? patientMap.get(Number(r.patientId)) ?? null : null,
      doctor: r.doctorId ? doctorMap.get(Number(r.doctorId)) ?? null : null,
      result: resultMap.get(Number(r.requestId)) ?? null,
    }));
  }

  // ───────────────────────────── Lab Request ────────────────────────────────

  async findAllRequests(
    query: LabRequestQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const {
      search,
      status,
      patientId,
      doctorId,
      testId,
      dateFrom,
      dateTo,
      sortBy = 'requestId',
      sortOrder = 'DESC',
      page = 1,
      limit = 20,
    } = query;

    const qb = this.labRequestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.test', 't')
      .skip((page - 1) * limit)
      .take(limit);

    if (search?.trim()) {
      qb.andWhere('t.testName LIKE :q', { q: `%${search.trim()}%` });
    }
    if (patientId) qb.andWhere('r.patientId = :patientId', { patientId });
    if (doctorId) qb.andWhere('r.doctorId = :doctorId', { doctorId });
    if (testId) qb.andWhere('r.testId = :testId', { testId });
    if (dateFrom) qb.andWhere('r.requestDate >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('r.requestDate <= :dateTo', { dateTo });

    if (status === 'Completed') {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM [Lab_Result] lr WHERE lr.request_id = r.request_id)`,
      );
    } else if (status === 'Pending') {
      qb.andWhere(
        `NOT EXISTS (SELECT 1 FROM [Lab_Result] lr WHERE lr.request_id = r.request_id)`,
      );
    }

    const sortCol = SORT_COLUMN_MAP[sortBy] ?? 'r.requestId';
    qb.orderBy(sortCol, sortOrder);

    const [data, total] = await qb.getManyAndCount();
    const hydrated = await this.hydrate(data);

    return PaginatedResponse.of(hydrated, total, page, limit);
  }

  async findOneRequest(id: number): Promise<any> {
    const request = await this.labRequestRepo.findOne({
      where: { requestId: id },
      relations: ['test'],
    });
    if (!request) throw new NotFoundException(`Lab request #${id} not found`);
    const [hydrated] = await this.hydrate([request]);
    return hydrated;
  }

  async createRequest(dto: CreateLabRequestDto): Promise<any> {
    // Validate referenced entities exist
    const test = await this.labTestRepo.findOne({ where: { testId: dto.testId } });
    if (!test) throw new BadRequestException(`Test #${dto.testId} does not exist`);

    const [patient] = await this.dataSource.query(
      `SELECT patient_id FROM [Patient] WHERE patient_id = @0`,
      [dto.patientId],
    );
    if (!patient)
      throw new BadRequestException(`Patient #${dto.patientId} does not exist`);

    const [doctor] = await this.dataSource.query(
      `SELECT doctor_id FROM [Doctor] WHERE doctor_id = @0`,
      [dto.doctorId],
    );
    if (!doctor)
      throw new BadRequestException(`Doctor #${dto.doctorId} does not exist`);

    const request = this.labRequestRepo.create({
      patientId: dto.patientId,
      doctorId: dto.doctorId,
      testId: dto.testId,
      requestDate: dto.requestDate ? new Date(dto.requestDate) : new Date(),
    });
    const saved = await this.labRequestRepo.save(request);
    return this.findOneRequest(saved.requestId);
  }

  async updateRequest(
    id: number,
    dto: UpdateLabRequestDto,
  ): Promise<any> {
    const request = await this.labRequestRepo.findOne({
      where: { requestId: id },
    });
    if (!request) throw new NotFoundException(`Lab request #${id} not found`);

    if (dto.testId !== undefined) {
      const test = await this.labTestRepo.findOne({
        where: { testId: dto.testId },
      });
      if (!test) throw new BadRequestException(`Test #${dto.testId} does not exist`);
      request.testId = dto.testId;
    }
    if (dto.patientId !== undefined) request.patientId = dto.patientId;
    if (dto.doctorId !== undefined) request.doctorId = dto.doctorId;
    if (dto.requestDate !== undefined)
      request.requestDate = new Date(dto.requestDate);

    await this.labRequestRepo.save(request);
    return this.findOneRequest(id);
  }

  async removeRequest(id: number): Promise<{ message: string }> {
    const request = await this.labRequestRepo.findOne({
      where: { requestId: id },
    });
    if (!request) throw new NotFoundException(`Lab request #${id} not found`);

    // Remove linked result first to satisfy FK
    await this.labResultRepo.delete({ requestId: id });
    await this.labRequestRepo.remove(request);
    return { message: `Lab request ${id} deleted` };
  }

  // ───────────────────────────── Lab Result ─────────────────────────────────

  async upsertResult(
    requestId: number,
    dto: CreateLabResultDto,
  ): Promise<LabResult> {
    const request = await this.labRequestRepo.findOne({
      where: { requestId },
    });
    if (!request)
      throw new NotFoundException(`Lab request #${requestId} not found`);

    const existing = await this.labResultRepo.findOne({
      where: { requestId },
    });

    if (existing) {
      existing.resultDetails = dto.resultDetails;
      existing.resultDate = dto.resultDate ? new Date(dto.resultDate) : new Date();
      return this.labResultRepo.save(existing);
    }

    const result = this.labResultRepo.create({
      requestId,
      resultDetails: dto.resultDetails,
      resultDate: dto.resultDate ? new Date(dto.resultDate) : new Date(),
    });
    return this.labResultRepo.save(result);
  }

  async updateResult(
    resultId: number,
    dto: UpdateLabResultDto,
  ): Promise<LabResult> {
    const result = await this.labResultRepo.findOne({
      where: { resultId },
    });
    if (!result) throw new NotFoundException(`Lab result #${resultId} not found`);

    if (dto.resultDetails !== undefined) result.resultDetails = dto.resultDetails;
    if (dto.resultDate !== undefined)
      result.resultDate = new Date(dto.resultDate);

    return this.labResultRepo.save(result);
  }

  async removeResult(resultId: number): Promise<{ message: string }> {
    const result = await this.labResultRepo.findOne({
      where: { resultId },
    });
    if (!result) throw new NotFoundException(`Lab result #${resultId} not found`);
    await this.labResultRepo.remove(result);
    return { message: `Lab result ${resultId} deleted` };
  }

  // ───────────────────────────── Lookups ────────────────────────────────────

  async listPatients(): Promise<any[]> {
    const rows: any[] = await this.dataSource.query(
      `SELECT patient_id AS patientId,
              first_name AS firstName,
              last_name  AS lastName,
              phone,
              email
         FROM [Patient]
         ORDER BY first_name, last_name`,
    );
    return rows.map((r) => ({ ...r, patientId: Number(r.patientId) }));
  }

  async listDoctors(): Promise<any[]> {
    const rows: any[] = await this.dataSource.query(
      `SELECT doctor_id AS doctorId,
              first_name AS firstName,
              last_name  AS lastName,
              phone,
              email
         FROM [Doctor]
         ORDER BY first_name, last_name`,
    );
    return rows.map((r) => ({ ...r, doctorId: Number(r.doctorId) }));
  }

  // ───────────────────────────── Stats ──────────────────────────────────────

  async getStats(): Promise<{
    totalTests: number;
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
    todayRequests: number;
  }> {
    const [totalTests, totalRequests, completed, todayRow] = await Promise.all([
      this.labTestRepo.count(),
      this.labRequestRepo.count(),
      this.labResultRepo.count(),
      this.dataSource.query(
        `SELECT COUNT(*) AS c FROM [Lab_Request]
          WHERE CAST(request_date AS date) = CAST(GETDATE() AS date)`,
      ),
    ]);

    const pendingRequests = Math.max(totalRequests - completed, 0);
    const todayRequests = Number(todayRow?.[0]?.c ?? 0);

    return {
      totalTests,
      totalRequests,
      pendingRequests,
      completedRequests: completed,
      todayRequests,
    };
  }
}
