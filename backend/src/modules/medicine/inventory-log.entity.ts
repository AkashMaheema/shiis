import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Medicine } from './medicine.entity';

@Entity({ name: 'Inventory_Log' })
export class InventoryLog {
  @PrimaryGeneratedColumn({ name: 'log_id' })
  logId: number;

  @Column({ name: 'medicine_id', type: 'int', nullable: true })
  medicineId: number | null;

  @Column({ name: 'change_type', type: 'varchar', length: 10, nullable: true })
  changeType: string | null;

  @Column({ name: 'quantity', type: 'int', nullable: true })
  quantity: number | null;

  @Column({
    name: 'date',
    type: 'datetime',
    nullable: true,
    default: () => 'GETDATE()',
  })
  date: Date | null;

  // ── Relations ───────────────────────────────────────────────────────────

  @ManyToOne(() => Medicine, (medicine) => medicine.inventoryLogs)
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;
}
