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
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierQueryDto } from './dto/supplier-query.dto';

/**
 * Safely extract the authenticated user's ID from the request.
 * Returns undefined when no auth context is present (e.g. during testing).
 */
function actorId(req: any): number | undefined {
  return req?.user?.userId ?? req?.user?.id ?? undefined;
}

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  // ── List / Search ─────────────────────────────────────────────────────────

  /**
   * GET /api/suppliers
   *
   * Supports all query params from SupplierQueryDto:
   *   ?page=1&limit=20&search=Pharma&city=Mumbai&country=India
   *   &sortBy=name&sortOrder=ASC&includeDeleted=false
   */
  @Get()
  async findAll(@Query() query: SupplierQueryDto) {
    return this.supplierService.findAll(query);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/suppliers/stats
   * Returns aggregate counts for the dashboard.
   */
  @Get('stats')
  async getStats() {
    return this.supplierService.getStats();
  }

  // ── Single record ─────────────────────────────────────────────────────────

  /**
   * GET /api/suppliers/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.findOne(id);
  }

  // ── Audit history ─────────────────────────────────────────────────────────

  /**
   * GET /api/suppliers/:id/audit
   * Returns the full change history for a supplier.
   */
  @Get(':id/audit')
  async getAuditHistory(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.getAuditHistory(id);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  /**
   * POST /api/suppliers
   * Returns 409 Conflict if a duplicate is detected.
   * Uses sp_UpsertSupplier stored procedure internally.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSupplierDto, @Request() req: any) {
    return this.supplierService.create(dto, actorId(req));
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /**
   * PATCH /api/suppliers/:id
   * Uses sp_UpsertSupplier stored procedure internally.
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
    @Request() req: any,
  ) {
    return this.supplierService.update(id, dto, actorId(req));
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  /**
   * DELETE /api/suppliers/:id
   * Soft-deletes the supplier (sets is_deleted = true).
   * The record is preserved in the database and can be restored.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.supplierService.remove(id, actorId(req));
  }

  // ── Restore ───────────────────────────────────────────────────────────────

  /**
   * PATCH /api/suppliers/:id/restore
   * Restores a soft-deleted supplier.
   */
  @Patch(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.supplierService.restore(id, actorId(req));
  }
}
