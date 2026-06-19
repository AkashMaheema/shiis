import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Bill } from './bill.entity';
import { BillItem } from './bill-item.entity';
import { Payment } from './payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bill, BillItem, Payment])],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
