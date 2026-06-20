import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientQueryDto } from './dto/patient-query.dto';

/**
 * Safely extract the authenticated user's ID from the request.
 * Returns undefined when no auth context is present (e.g. during testing).
 */
function actorId(req: any): number | undefined {
  return req?.user?.userId ?? req?.user?.id ?? undefined;
}

@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  // ── List / Search ─────────────────────────────────────────────────────────

  /**
   * GET /api/patients
   *
   * Supports all query params from PatientQueryDto:
   *   ?page=1&limit=20&search=John&gender=Male&dobFrom=1990-01-01&dobTo=2000-12-31
   *   &sortBy=lastName&sortOrder=ASC&includeDeleted=false
   */
  @Get()
  async findAll(@Query() query: PatientQueryDto) {
    return this.patientService.findAll(query);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/patients/stats
   * Returns aggregate counts for the dashboard.
   */
  @Get('stats')
  async getStats() {
    return this.patientService.getStats();
  }

  @Get('search/procedure')
  async searchWithProcedure(@Query('q') query = '') {
    return this.patientService.searchWithProcedure(query);
  }

  // ── Single record ─────────────────────────────────────────────────────────

  /**
   * GET /api/patients/:id
   */
  @Get(':id/visit-history')
  async getVisitHistory(@Param('id', ParseIntPipe) id: number) {
    return this.patientService.getVisitHistory(id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.patientService.findOne(id);
  }

  // ── Audit history ─────────────────────────────────────────────────────────

  /**
   * GET /api/patients/:id/audit
   * Returns the full change history for a patient.
   */
  @Get(':id/audit')
  async getAuditHistory(@Param('id', ParseIntPipe) id: number) {
    return this.patientService.getAuditHistory(id);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  /**
   * POST /api/patients
   * Returns 409 Conflict if a duplicate is detected.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePatientDto, @Request() req: any) {
    return this.patientService.create(dto, actorId(req));
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /**
   * PATCH /api/patients/:id
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
    @Request() req: any,
  ) {
    return this.patientService.update(id, dto, actorId(req));
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  /**
   * DELETE /api/patients/:id
   * Soft-deletes the patient (sets is_deleted = true).
   * The record is preserved in the database and can be restored.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.patientService.remove(id, actorId(req));
  }

  // ── Restore ───────────────────────────────────────────────────────────────

  /**
   * PATCH /api/patients/:id/restore
   * Restores a soft-deleted patient.
   */
  @Patch(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.patientService.restore(id, actorId(req));
  }
}
