import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Appointment } from '../appointment/appointment.entity';
import { PrescriptionItem } from './prescription-item.entity';

@Entity({ name: 'Prescription' })
export class Prescription {
  @PrimaryGeneratedColumn({ name: 'prescription_id' })
  prescriptionId: number;

  @Column({ name: 'appointment_id', type: 'int', nullable: true })
  appointmentId: number | null;

  @ManyToOne(() => Appointment, { nullable: true, eager: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment | null;

  @Column({ name: 'issued_date', type: 'datetime', nullable: true })
  issuedDate: Date | null;

  @Column({ name: 'notes', type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'int', nullable: true })
  deletedBy: number | null;

  @Column({ name: 'created_at', type: 'datetime', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'updated_at', type: 'datetime', nullable: true })
  updatedAt: Date | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @OneToMany(() => PrescriptionItem, (item) => item.prescription)
  items: PrescriptionItem[];
}
