import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Prescription } from './prescription.entity';
import { Medicine } from './medicine.entity';

@Entity({ name: 'Prescription_Item' })
export class PrescriptionItem {
  @PrimaryGeneratedColumn({ name: 'item_id' })
  itemId: number;

  @Column({ name: 'prescription_id', type: 'int' })
  prescriptionId: number;

  @ManyToOne(() => Prescription, (prescription) => prescription.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'prescription_id' })
  prescription: Prescription;

  @Column({ name: 'medicine_id', type: 'int' })
  medicineId: number;

  @ManyToOne(() => Medicine, { eager: true })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @Column({ name: 'dosage', type: 'varchar', length: 100, nullable: true })
  dosage: string | null;

  @Column({ name: 'quantity', type: 'int', nullable: true })
  quantity: number | null;
}
