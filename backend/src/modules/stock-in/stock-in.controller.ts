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
import { StockInService } from './stock-in.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto';
import { ReceiveOrderDto } from './dto/receive-order.dto';

function actorId(req: any): number | undefined {
  return req?.user?.userId ?? req?.user?.id ?? undefined;
}

@Controller('stock-in')
export class StockInController {
  constructor(private readonly stockInService: StockInService) {}

  // ── List ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/stock-in
   * ?page=1&limit=20&status=Pending&supplierId=3&sortBy=createdAt&sortOrder=DESC
   */
  @Get()
  async findAll(@Query() query: PurchaseOrderQueryDto) {
    return this.stockInService.findAll(query);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /** GET /api/stock-in/stats */
  @Get('stats')
  async getStats() {
    return this.stockInService.getStats();
  }

  // ── Single ────────────────────────────────────────────────────────────────

  /** GET /api/stock-in/:id */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stockInService.findOne(id);
  }

  // ── Batches tab ───────────────────────────────────────────────────────────

  /** GET /api/stock-in/:id/batches — batch & expiry data for this PO */
  @Get(':id/batches')
  async getBatches(@Param('id', ParseIntPipe) id: number) {
    return this.stockInService.getBatches(id);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  /** POST /api/stock-in */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePurchaseOrderDto, @Request() req: any) {
    return this.stockInService.create(dto, actorId(req));
  }

  // ── Update ────────────────────────────────────────────────────────────────

  /** PATCH /api/stock-in/:id */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePurchaseOrderDto,
    @Request() req: any,
  ) {
    return this.stockInService.update(id, dto, actorId(req));
  }

  // ── Receive stock ─────────────────────────────────────────────────────────

  /**
   * POST /api/stock-in/:id/receive
   * Processes stock into Medicine_Batch + Stock + Inventory_Log via stored proc.
   */
  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReceiveOrderDto,
    @Request() req: any,
  ) {
    return this.stockInService.receive(id, dto, actorId(req));
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  /** POST /api/stock-in/:id/cancel */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.stockInService.cancel(id, actorId(req));
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  /** DELETE /api/stock-in/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.stockInService.remove(id, actorId(req));
  }
}
