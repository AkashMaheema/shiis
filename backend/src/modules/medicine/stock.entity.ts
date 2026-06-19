import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Medicine } from './medicine.entity';

@Entity({ name: 'Stock' })
export class Stock {
  @PrimaryGeneratedColumn({ name: 'stock_id' })
  stockId: number;

  @Column({ name: 'medicine_id', type: 'int', nullable: true })
  medicineId: number | null;

  @Column({ name: 'total_quantity', type: 'int', nullable: true, default: 0 })
  totalQuantity: number | null;

  // ── Relations ───────────────────────────────────────────────────────────

  @OneToOne(() => Medicine, (medicine) => medicine.stock)
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;
}
