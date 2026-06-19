import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { Supplier } from '../supplier/supplier.entity';

export type PoStatus = 'Draft' | 'Pending' | 'Received' | 'Cancelled';

@Entity({ name: 'Purchase_Order' })
export class PurchaseOrder {
  @PrimaryGeneratedColumn({ name: 'po_id' })
  poId: number;

  @Column({ name: 'supplier_id', type: 'int', nullable: true })
  supplierId: number;

  @Column({ name: 'order_date', type: 'datetime', nullable: true })
  orderDate: Date;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: true, default: 'Draft' })
  status: PoStatus;

  @Column({ name: 'notes', type: 'varchar', length: 500, nullable: true })
  notes: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalAmount: number;

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

  // ── Relation ─────────────────────────────────────────────────────────────
  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, { cascade: true, eager: false })
  items: PurchaseOrderItem[];

  @ManyToOne(() => Supplier, { eager: false })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;
}
