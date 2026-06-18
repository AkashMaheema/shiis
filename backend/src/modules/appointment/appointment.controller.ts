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
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';

/**
 * Safely extract the authenticated user's ID from the request.
 * Returns undefined when no auth context is present (e.g. during testing).
 */
function actorId(req: any): number | undefined {
  return req?.user?.userId ?? req?.user?.id ?? undefined;
}

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  // ── List / Search ─────────────────────────────────────────────────────────

  /**
   * GET /api/appointments
   *
   * Supports all query params from AppointmentQueryDto:
   *   ?page=1&limit=20&search=John&status=Scheduled&dateFrom=2025-01-01&dateTo=2025-12-31
   *   &patientId=5&sortBy=appointmentDate&sortOrder=DESC&includeDeleted=false
   */
  @Get()
  async findAll(@Query() query: AppointmentQueryDto) {
    return this.appointmentService.findAll(query);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/appointments/stats
   * Returns aggregate counts for the dashboard.
   */
  @Get('stats')
  async getStats() {
    return this.appointmentService.getStats();
  }

  // ── Single record ─────────────────────────────────────────────────────────

  /**
   * GET /api/appointments/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.findOne(id);
  }

  // ── Audit history ─────────────────────────────────────────────────────────

  /**
   * GET /api/appointments/:id/audit
   * Returns the full change history for an appointment.
   */
  @Get(':id/audit')
  async getAuditHistory(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.getAuditHistory(id);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  /**
   * POST /api/appointments
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAppointmentDto, @Request() req: any) {
    return this.appointmentService.create(dto, actorId(req));
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /**
   * PATCH /api/appointments/:id
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
    @Request() req: any,
  ) {
    return this.appointmentService.update(id, dto, actorId(req));
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  /**
   * DELETE /api/appointments/:id
   * Soft-deletes the appointment (sets is_deleted = true).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentService.remove(id, actorId(req));
  }

  // ── Restore ───────────────────────────────────────────────────────────────

  /**
   * PATCH /api/appointments/:id/restore
   * Restores a soft-deleted appointment.
   */
  @Patch(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.appointmentService.restore(id, actorId(req));
  }
}
