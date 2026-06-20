import { IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProcessPaymentDto {
  @IsIn(['Cash', 'Card', 'Online', 'Insurance'])
  paymentMethod: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;
}
