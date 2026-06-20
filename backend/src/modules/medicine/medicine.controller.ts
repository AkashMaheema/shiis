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
} from '@nestjs/common';
import { MedicineService } from './medicine.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { MedicineQueryDto } from './dto/medicine-query.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';

@Controller('medicines')
export class MedicineController {
  constructor(private readonly medicineService: MedicineService) {}

  // ── List / Search ─────────────────────────────────────────────────────────

  /**
   * GET /api/medicines
   * Paginated list with stock info, search, category filter, and sorting.
   */
  @Get()
  async findAll(@Query() query: MedicineQueryDto) {
    return this.medicineService.findAll(query);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/medicines/stats
   * Returns aggregate counts for the dashboard.
   */
  @Get('stats')
  async getStats() {
    return this.medicineService.getStats();
  }

  @Get('inventory-risk')
  async getInventoryRiskReport(
    @Query('lowStockThreshold', new ParseIntPipe({ optional: true }))
    lowStockThreshold = 10,
    @Query('expiryDays', new ParseIntPipe({ optional: true })) expiryDays = 30,
  ) {
    return this.medicineService.getInventoryRiskReport(
      lowStockThreshold,
      expiryDays,
    );
  }

  @Get('low-stock')
  async getLowStockMedicines(
    @Query('threshold', new ParseIntPipe({ optional: true })) threshold = 10,
  ) {
    return this.medicineService.getLowStockMedicines(threshold);
  }

  @Get('expiring-batches')
  async getExpiringBatches(
    @Query('days', new ParseIntPipe({ optional: true })) days = 30,
  ) {
    return this.medicineService.getExpiringBatches(days);
  }

  // ── Single record ─────────────────────────────────────────────────────────

  /**
   * GET /api/medicines/:id
   * Returns medicine with stock, batches, and inventory logs.
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.medicineService.findOne(id);
  }

  // ── Inventory Log ─────────────────────────────────────────────────────────

  /**
   * GET /api/medicines/:id/log
   * Returns paginated inventory log for a medicine.
   */
  @Get(':id/log')
  async getInventoryLog(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.medicineService.getInventoryLog(id, page, limit);
  }

  @Get(':id/movement-history')
  async getMedicineMovementHistory(@Param('id', ParseIntPipe) id: number) {
    return this.medicineService.getMedicineMovementHistory(id);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  /**
   * POST /api/medicines
   * Creates a new medicine with an associated stock record.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateMedicineDto) {
    return this.medicineService.create(dto);
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /**
   * PATCH /api/medicines/:id
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMedicineDto,
  ) {
    return this.medicineService.update(id, dto);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  /**
   * DELETE /api/medicines/:id
   * Hard-deletes the medicine and all related records.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.medicineService.remove(id);
  }

  // ── Stock Adjustment ──────────────────────────────────────────────────────

  /**
   * POST /api/medicines/:id/stock
   * Adjust stock (IN/OUT) with optional batch info.
   */
  @Post(':id/stock')
  @HttpCode(HttpStatus.OK)
  async adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StockAdjustmentDto,
  ) {
    return this.medicineService.adjustStock(id, dto);
  }
}
