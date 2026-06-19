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
import { DoctorService } from './doctor.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { DoctorQueryDto } from './dto/doctor-query.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

function actorId(req: any): number | undefined {
  return req?.user?.userId ?? req?.user?.id ?? undefined;
}

@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get()
  findAll(@Query() query: DoctorQueryDto) {
    return this.doctorService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.doctorService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDoctorDto, @Request() req: any) {
    return this.doctorService.create(dto, actorId(req));
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDoctorDto,
    @Request() req: any,
  ) {
    return this.doctorService.update(id, dto, actorId(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.doctorService.remove(id, actorId(req));
  }
}
