import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Medicine } from './medicine.entity';

@Entity({ name: 'Medicine_Batch' })
export class MedicineBatch {
  @PrimaryGeneratedColumn({ name: 'batch_id' })
  batchId: number;

  @Column({ name: 'medicine_id', type: 'int' })
  medicineId: number;

  @Column({ name: 'batch_no', type: 'varchar', length: 50, nullable: true })
  batchNo: string | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'quantity', type: 'int', nullable: true })
  quantity: number | null;

  // ── Relations ───────────────────────────────────────────────────────────

  @ManyToOne(() => Medicine, (medicine) => medicine.batches)
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;
}
