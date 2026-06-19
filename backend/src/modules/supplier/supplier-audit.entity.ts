import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

@Entity({ name: 'SupplierAudit' })
export class SupplierAudit {
  @PrimaryGeneratedColumn({ name: 'audit_id' })
  auditId: number;

  @Column({ name: 'supplier_id', type: 'int' })
  supplierId: number;

  @Column({ name: 'changed_by', type: 'int', nullable: true })
  changedBy: number | null;

  @Column({ name: 'action', type: 'varchar', length: 10 })
  action: AuditAction;

  /**
   * Full JSON snapshot of the supplier record at the time of the change.
   * On CREATE this holds the new record; on DELETE it holds the last state.
   */
  @Column({ name: 'snapshot', type: 'nvarchar', length: 'max' })
  snapshot: string;

  /**
   * Only populated on UPDATE — JSON of only the fields that changed.
   * Format: { field: { from: oldValue, to: newValue } }
   */
  @Column({ name: 'diff', type: 'nvarchar', length: 'max', nullable: true })
  diff: string | null;

  @CreateDateColumn({ name: 'changed_at', type: 'datetime' })
  changedAt: Date;
}
