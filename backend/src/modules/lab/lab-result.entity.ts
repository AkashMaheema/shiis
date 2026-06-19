import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { LabRequest } from './lab-request.entity';

@Entity({ name: 'Lab_Result' })
export class LabResult {
  @PrimaryGeneratedColumn({ name: 'result_id' })
  resultId: number;

  @Column({ name: 'request_id', type: 'int', nullable: true })
  requestId: number | null;

  @Column({
    name: 'result_details',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  resultDetails: string | null;

  @Column({ name: 'result_date', type: 'datetime', nullable: true })
  resultDate: Date | null;

  @OneToOne(() => LabRequest, (request) => request.result)
  @JoinColumn({ name: 'request_id' })
  request: LabRequest;
}
