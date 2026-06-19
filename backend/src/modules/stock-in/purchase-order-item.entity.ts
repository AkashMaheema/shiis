import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';

@Entity({ name: 'Purchase_Order_Item' })
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn({ name: 'po_item_id' })
  poItemId: number;

  @Column({ name: 'po_id', type: 'int', nullable: true })
  poId: number;

  @Column({ name: 'medicine_id', type: 'int', nullable: true })
  medicineId: number;

  @Column({ name: 'quantity', type: 'int', nullable: true })
  quantity: number;

  @Column({ name: 'cost_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  costPrice: number;

  @Column({ name: 'received_qty', type: 'int', default: 0 })
  receivedQty: number;

  @Column({ name: 'notes', type: 'varchar', length: 255, nullable: true })
  notes: string;

  // ── Relation ─────────────────────────────────────────────────────────────
  @ManyToOne(() => PurchaseOrder, (po) => po.items)
  @JoinColumn({ name: 'po_id' })
  purchaseOrder: PurchaseOrder;
}
