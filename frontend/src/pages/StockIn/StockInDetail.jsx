import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  PackageCheck,
  XCircle,
  Hash,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";
import stockInService from "../../api/services/stockInService";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";

const STATUS_META = {
  Draft: { cls: "bg-surface-100 text-surface-600 border-surface-300/50", icon: FileText },
  Pending: { cls: "bg-amber-50 text-amber-700 border-amber-300/50", icon: Clock },
  Received: { cls: "bg-emerald-50 text-emerald-700 border-emerald-300/50", icon: CheckCircle2 },
  Cancelled: { cls: "bg-red-50 text-red-600 border-red-300/50", icon: XCircle },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.Draft;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.cls}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function expiryColor(dateStr) {
  if (!dateStr) return "text-surface-500";
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (days < 0) return "text-red-600 font-semibold";
  if (days <= 90) return "text-amber-600 font-semibold";
  return "text-emerald-600";
}

function expiryDot(dateStr) {
  if (!dateStr) return "🔵";
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (days < 0) return "🔴";
  if (days <= 90) return "🟡";
  return "🟢";
}

const TABS = ["Items", "Batches"];

export default function StockInDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Items");
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchPo = () => {
    setLoading(true);
    stockInService
      .getById(id)
      .then(setPo)
      .catch(() => {
        toast.error("Failed to load order.");
        navigate("/stock-in");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPo();
    stockInService
      .getBatches(id)
      .then(setBatches)
      .catch(() => {});
    // eslint-disable-next-line
  }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await stockInService.cancel(id);
      toast.success("Order cancelled.");
      setCancelModal(false);
      fetchPo();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to cancel order.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Loader text="Loading order details..." />;
  if (!po) return null;

  const canEdit = po.status === "Draft" || po.status === "Pending";
  const canReceive = po.status === "Draft" || po.status === "Pending";
  const canCancel = canEdit;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => navigate("/stock-in")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Stock In
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <Button size="sm" variant="secondary" onClick={() => navigate(`/stock-in/${id}/edit`)}>
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
          {canReceive && (
            <Button size="sm" onClick={() => navigate(`/stock-in/${id}/receive`)}>
              <PackageCheck className="w-3.5 h-3.5" />
              Receive Stock
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="danger" onClick={() => setCancelModal(true)}>
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-surface-200/60">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900">PO #{po.poId}</h1>
              <div className="mt-1">
                <StatusBadge status={po.status} />
              </div>
            </div>
          </div>
          {po.totalAmount != null && (
            <div className="text-right">
              <p className="text-xs text-surface-500">Total Amount</p>
              <p className="text-2xl font-bold text-surface-900">
                ₹{Number(po.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Building2, label: "Supplier", value: po.supplier?.name || `Supplier #${po.supplierId}` },
            {
              icon: Calendar,
              label: "Order Date",
              value: po.orderDate
                ? new Date(po.orderDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "—",
            },
            { icon: Hash, label: "Items", value: `${po.items?.length ?? 0} line(s)` },
            { icon: FileText, label: "Notes", value: po.notes || "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-surface-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="text-sm text-surface-800 font-medium mt-0.5 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-surface-200/60">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-surface-500 hover:text-surface-800"
              }`}
            >
              {tab}
              {tab === "Batches" && batches.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold">
                  {batches.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Items tab */}
          {activeTab === "Items" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-surface-500 uppercase tracking-wide border-b border-surface-200/60">
                    <th className="text-left pb-3 pr-4 font-medium">Medicine ID</th>
                    <th className="text-right pb-3 pr-4 font-medium">Ordered</th>
                    <th className="text-right pb-3 pr-4 font-medium">Received</th>
                    <th className="text-right pb-3 pr-4 font-medium">Cost/Unit</th>
                    <th className="text-right pb-3 font-medium">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.items ?? []).map((item) => (
                    <tr key={item.poItemId} className="border-b border-surface-100 last:border-0">
                      <td className="py-3 pr-4 text-surface-800 font-medium">
                        Medicine #{item.medicineId}
                      </td>
                      <td className="py-3 pr-4 text-right text-surface-700">{item.quantity}</td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className={
                            item.receivedQty >= item.quantity
                              ? "text-emerald-600 font-medium"
                              : item.receivedQty > 0
                              ? "text-amber-600"
                              : "text-surface-400"
                          }
                        >
                          {item.receivedQty ?? 0}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right text-surface-700">
                        {item.costPrice != null
                          ? `₹${Number(item.costPrice).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-3 text-right font-medium text-surface-900">
                        {item.costPrice != null
                          ? `₹${(item.quantity * item.costPrice).toFixed(2)}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Batches tab */}
          {activeTab === "Batches" && (
            batches.length === 0 ? (
              <div className="py-12 text-center text-surface-400 text-sm">
                No batches recorded yet. Receive stock to create batch entries.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-surface-500 uppercase tracking-wide border-b border-surface-200/60">
                      <th className="text-left pb-3 pr-4 font-medium">Medicine</th>
                      <th className="text-left pb-3 pr-4 font-medium">Batch No.</th>
                      <th className="text-right pb-3 pr-4 font-medium">Qty</th>
                      <th className="text-left pb-3 pr-4 font-medium">Expiry</th>
                      <th className="text-right pb-3 font-medium">Cost/Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b.batchId} className="border-b border-surface-100 last:border-0">
                        <td className="py-3 pr-4 text-surface-800 font-medium">{b.medicineName}</td>
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs bg-surface-100 px-2 py-0.5 rounded">
                            {b.batchNo || "—"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right text-surface-700">{b.quantity}</td>
                        <td className="py-3 pr-4">
                          <span className={expiryColor(b.expiryDate)}>
                            {expiryDot(b.expiryDate)}{" "}
                            {b.expiryDate
                              ? new Date(b.expiryDate).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </span>
                        </td>
                        <td className="py-3 text-right text-surface-700">
                          {b.costPrice != null ? `₹${Number(b.costPrice).toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModal}
        onClose={() => setCancelModal(false)}
        title="Cancel Purchase Order"
        size="sm"
      >
        <div className="flex items-start gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-surface-600">
            Are you sure you want to cancel <strong>PO #{po.poId}</strong>?
            This cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCancelModal(false)}>
            Keep Order
          </Button>
          <Button variant="danger" onClick={handleCancel} loading={cancelling}>
            Cancel Order
          </Button>
        </div>
      </Modal>
    </div>
  );
}
