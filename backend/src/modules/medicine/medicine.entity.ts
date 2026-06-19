import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { MedicineBatch } from './medicine-batch.entity';
import { Stock } from './stock.entity';
import { InventoryLog } from './inventory-log.entity';

@Entity({ name: 'Medicine' })
export class Medicine {
  @PrimaryGeneratedColumn({ name: 'medicine_id' })
  medicineId: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'category', type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  unitPrice: number | null;

  // ── Relations ───────────────────────────────────────────────────────────

  @OneToMany(() => MedicineBatch, (batch) => batch.medicine)
  batches: MedicineBatch[];

  @OneToOne(() => Stock, (stock) => stock.medicine)
  stock: Stock;

  @OneToMany(() => InventoryLog, (log) => log.medicine)
  inventoryLogs: InventoryLog[];
}
