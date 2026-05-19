import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Patient } from '../patient/patient.entity';

@Entity({ name: 'Appointment' })
export class Appointment {
  @PrimaryGeneratedColumn({ name: 'appointment_id' })
  appointmentId: number;

  @Column({ name: 'patient_id', type: 'int' })
  patientId: number;

  @Column({ name: 'doctor_id', type: 'int' })
  doctorId: number;

  @ManyToOne(() => Patient, { eager: true })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'appointment_date', type: 'datetime' })
  appointmentDate: Date;

  @Column({ name: 'appointment_time', type: 'varchar', length: 10, nullable: true })
  appointmentTime: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: "'Scheduled'" })
  status: string;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true })
  reason: string;

  @Column({ name: 'notes', type: 'nvarchar', length: 'max', nullable: true })
  notes: string;

  // ── Soft delete ──────────────────────────────────────────────────────────
  @Column({ name: 'is_deleted', type: 'bit', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deleted_by', type: 'int', nullable: true })
  deletedBy: number | null;

  // ── Timestamps ───────────────────────────────────────────────────────────
  @CreateDateColumn({ name: 'created_at', type: 'datetime', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', nullable: true })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;
}
