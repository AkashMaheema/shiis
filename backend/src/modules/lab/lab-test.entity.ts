import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Lab_Test' })
export class LabTest {
  @PrimaryGeneratedColumn({ name: 'test_id' })
  testId: number;

  @Column({ name: 'test_name', type: 'varchar', length: 100, nullable: true })
  testName: string;

  @Column({ name: 'price', type: 'decimal', precision: 18, scale: 2, nullable: true })
  price: number;
}
