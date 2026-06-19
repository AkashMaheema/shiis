import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingQueryDto } from './dto/billing-query.dto';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';

function actorId(req: any): number | undefined {
  return req?.user?.userId ?? req?.user?.id ?? undefined;
}

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  findAll(@Query() query: BillingQueryDto) {
    return this.billingService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.billingService.getStats();
  }

  @Get('patients')
  listPatients() {
    return this.billingService.listPatients();
  }

  @Get('appointments')
  listAppointments() {
    return this.billingService.listAppointments();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBillDto, @Request() req: any) {
    return this.billingService.create(dto, actorId(req));
  }

  @Post('generate/:appointmentId')
  @HttpCode(HttpStatus.CREATED)
  generateFromAppointment(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @Request() req: any,
  ) {
    return this.billingService.generateFromAppointment(appointmentId, actorId(req));
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBillDto,
    @Request() req: any,
  ) {
    return this.billingService.update(id, dto, actorId(req));
  }

  @Post(':id/payments')
  processPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessPaymentDto,
    @Request() req: any,
  ) {
    return this.billingService.processPayment(id, dto, actorId(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.billingService.remove(id, actorId(req));
  }
}
