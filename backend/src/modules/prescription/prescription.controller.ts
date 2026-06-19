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
import { PrescriptionService } from './prescription.service';
import { PrescriptionQueryDto } from './dto/prescription-query.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto';

function actorId(req: any): number | undefined {
  return req?.user?.userId ?? req?.user?.id ?? undefined;
}

@Controller('prescriptions')
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Get()
  findAll(@Query() query: PrescriptionQueryDto) {
    return this.prescriptionService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.prescriptionService.getStats();
  }

  @Get('appointments')
  listAppointments() {
    return this.prescriptionService.listAppointments();
  }

  @Get('patients')
  listPatients() {
    return this.prescriptionService.listPatients();
  }

  @Get('medicines')
  listMedicines(@Query('search') search?: string) {
    return this.prescriptionService.listMedicines(search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.prescriptionService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePrescriptionDto, @Request() req: any) {
    return this.prescriptionService.create(dto, actorId(req));
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrescriptionDto,
    @Request() req: any,
  ) {
    return this.prescriptionService.update(id, dto, actorId(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.prescriptionService.remove(id, actorId(req));
  }
}
