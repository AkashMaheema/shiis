import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Medicine' })
export class Medicine {
  @PrimaryGeneratedColumn({ name: 'medicine_id' })
  medicineId: number;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;
}
