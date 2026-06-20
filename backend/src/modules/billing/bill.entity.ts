import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from '../patient/patient.entity';
import { Appointment } from '../appointment/appointment.entity';
import { BillItem } from './bill-item.entity';
import { Payment } from './payment.entity';

@Entity({ name: 'Bill' })
export class Bill {
  @PrimaryGeneratedColumn({ name: 'bill_id' })
  billId: number;

  @Column({ name: 'patient_id', type: 'int', nullable: true })
  patientId: number | null;

  @Column({ name: 'appointment_id', type: 'int', nullable: true })
  appointmentId: number | null;

  @ManyToOne(() => Patient, { nullable: true, eager: true })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient | null;

  @ManyToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment | null;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalAmount: number | null;

  @Column({ name: 'created_date', type: 'datetime', nullable: true })
  createdDate: Date | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'Unpaid' })
  status: string;

  @Column({ name: 'notes', type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'int', nullable: true })
  deletedBy: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', nullable: true })
  createdAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', nullable: true })
  updatedAt: Date | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @OneToMany(() => BillItem, (item) => item.bill)
  items: BillItem[];

  @OneToMany(() => Payment, (payment) => payment.bill)
  payments: Payment[];
}
