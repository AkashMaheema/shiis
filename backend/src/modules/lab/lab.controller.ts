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
} from '@nestjs/common';
import { LabService } from './lab.service';
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

@Controller('lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  // ── Stats ─────────────────────────────────────────────────────────────────
  @Get('stats')
  getStats() {
    return this.labService.getStats();
  }

  // ── Doctors lookup ────────────────────────────────────────────────────────
  @Get('doctors')
  listDoctors() {
    return this.labService.listDoctors();
  }

  @Get('patients')
  listPatients() {
    return this.labService.listPatients();
  }

  // ── Lab Test catalog ──────────────────────────────────────────────────────
  @Get('tests')
  findAllTests(@Query('search') search?: string) {
    return this.labService.findAllTests(search);
  }

  @Get('tests/:id')
  findOneTest(@Param('id', ParseIntPipe) id: number) {
    return this.labService.findOneTest(id);
  }

  @Post('tests')
  @HttpCode(HttpStatus.CREATED)
  createTest(@Body() dto: CreateLabTestDto) {
    return this.labService.createTest(dto);
  }

  @Patch('tests/:id')
  updateTest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLabTestDto,
  ) {
    return this.labService.updateTest(id, dto);
  }

  @Delete('tests/:id')
  removeTest(@Param('id', ParseIntPipe) id: number) {
    return this.labService.removeTest(id);
  }

  // ── Lab Requests ──────────────────────────────────────────────────────────
  @Get('requests')
  findAllRequests(@Query() query: LabRequestQueryDto) {
    return this.labService.findAllRequests(query);
  }

  @Get('requests/:id')
  findOneRequest(@Param('id', ParseIntPipe) id: number) {
    return this.labService.findOneRequest(id);
  }

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  createRequest(@Body() dto: CreateLabRequestDto) {
    return this.labService.createRequest(dto);
  }

  @Patch('requests/:id')
  updateRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLabRequestDto,
  ) {
    return this.labService.updateRequest(id, dto);
  }

  @Delete('requests/:id')
  removeRequest(@Param('id', ParseIntPipe) id: number) {
    return this.labService.removeRequest(id);
  }

  // ── Lab Results ───────────────────────────────────────────────────────────
  @Post('requests/:id/result')
  @HttpCode(HttpStatus.CREATED)
  upsertResult(
    @Param('id', ParseIntPipe) requestId: number,
    @Body() dto: CreateLabResultDto,
  ) {
    return this.labService.upsertResult(requestId, dto);
  }

  @Patch('results/:id')
  updateResult(
    @Param('id', ParseIntPipe) resultId: number,
    @Body() dto: UpdateLabResultDto,
  ) {
    return this.labService.updateResult(resultId, dto);
  }

  @Delete('results/:id')
  removeResult(@Param('id', ParseIntPipe) resultId: number) {
    return this.labService.removeResult(resultId);
  }
}
