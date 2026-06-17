import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { LabTest } from './lab-test.entity';
import { LabResult } from './lab-result.entity';

@Entity({ name: 'Lab_Request' })
export class LabRequest {
  @PrimaryGeneratedColumn({ name: 'request_id' })
  requestId: number;

  @Column({ name: 'patient_id', type: 'int', nullable: true })
  patientId: number | null;

  @Column({ name: 'doctor_id', type: 'int', nullable: true })
  doctorId: number | null;

  @Column({ name: 'test_id', type: 'int', nullable: true })
  testId: number | null;

  @Column({
    name: 'request_date',
    type: 'datetime',
    nullable: true,
  })
  requestDate: Date;

  @ManyToOne(() => LabTest)
  @JoinColumn({ name: 'test_id' })
  test: LabTest;

  @OneToOne(() => LabResult, (result) => result.request)
  result?: LabResult;
}
