import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Package,
  Tag,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Boxes,
  Hash,
  Calendar,
  Plus,
  Minus,
} from "lucide-react";
import medicineService from "../../api/services/medicineService";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { toast } from "react-toastify";

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-surface-200/60 last:border-0">
      <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-surface-400 font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm text-surface-800 font-medium mt-0.5">
          {value || <span className="text-surface-400 font-normal">—</span>}
        </p>
      </div>
    </div>
  );
}

function StockStatusBanner({ quantity }) {
  const qty = quantity ?? 0;
  let bg, text, label;

  if (qty === 0) {
    bg = "bg-red-50 border-red-200/60";
    text = "text-red-600";
    label = "Out of Stock";
  } else if (qty <= 10) {
    bg = "bg-amber-50 border-amber-200/60";
    text = "text-amber-600";
    label = "Low Stock";
  } else {
    bg = "bg-emerald-50 border-emerald-200/60";
    text = "text-emerald-600";
    label = "In Stock";
  }

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border ${bg}`}>
      <div className="flex items-center gap-2">
        <Boxes className={`w-5 h-5 ${text}`} />
        <span className={`text-sm font-semibold ${text}`}>{label}</span>
      </div>
      <span className={`text-lg font-bold ${text}`}>{qty} units</span>
    </div>
  );
}

export default function MedicineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [medicine, setMedicine] = useState(null);
  const [loading, setLoading] = useState(true);

  // Stock adjustment state
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState("IN");
  const [adjustBatch, setAdjustBatch] = useState("");
  const [adjustExpiry, setAdjustExpiry] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const fetchMedicine = () => {
    setLoading(true);
    medicineService
      .getById(id)
      .then(setMedicine)
      .catch(() => {
        toast.error("Failed to load medicine details.");
        navigate("/inventory");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMedicine();
  }, [id]);

  const handleStockAdjust = async (e) => {
    e.preventDefault();
    const qty = parseInt(adjustQty, 10);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity.");
      return;
    }

    setAdjusting(true);
    try {
      const payload = {
        quantity: qty,
        changeType: adjustType,
        ...(adjustType === "IN" && adjustBatch ? { batchNo: adjustBatch } : {}),
        ...(adjustType === "IN" && adjustExpiry ? { expiryDate: adjustExpiry } : {}),
      };
      const updated = await medicineService.adjustStock(id, payload);
      setMedicine(updated);
      setAdjustQty("");
      setAdjustBatch("");
      setAdjustExpiry("");
      toast.success(
        `Stock ${adjustType === "IN" ? "added" : "removed"}: ${qty} units`,
      );
    } catch (err) {
      const msg =
        err.response?.data?.message || "Stock adjustment failed.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) return <Loader text="Loading medicine details..." />;
  if (!medicine) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/inventory")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inventory
        </button>

        <Button size="sm" onClick={() => navigate(`/inventory/${id}/edit`)}>
          <Edit3 className="w-3.5 h-3.5" />
          Edit Medicine
        </Button>
      </div>

      {/* ── Medicine Info Card ── */}
      <div className="glass-card p-6">
        {/* Header */}
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-surface-200/60">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Package className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">
              {medicine.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-surface-500">
                {medicine.category || "Uncategorized"}
              </span>
              <span className="text-surface-300">·</span>
              <span className="text-sm text-surface-500">
                ID #{medicine.medicineId}
              </span>
            </div>
          </div>
        </div>

        {/* Stock Status */}
        <div className="mb-6">
          <StockStatusBanner
            quantity={medicine.stock?.totalQuantity}
          />
        </div>

        {/* Detail rows */}
        <div>
          <DetailRow
            icon={<Hash className="w-4 h-4 text-primary-500" />}
            label="Medicine ID"
            value={`#${medicine.medicineId}`}
          />
          <DetailRow
            icon={<Tag className="w-4 h-4 text-primary-500" />}
            label="Category"
            value={medicine.category}
          />
          <DetailRow
            icon={<DollarSign className="w-4 h-4 text-primary-500" />}
            label="Unit Price"
            value={
              medicine.unitPrice != null
                ? `Rs. ${Number(medicine.unitPrice).toFixed(2)}`
                : null
            }
          />
          <DetailRow
            icon={<Boxes className="w-4 h-4 text-primary-500" />}
            label="Current Stock"
            value={
              medicine.stock
                ? `${medicine.stock.totalQuantity ?? 0} units`
                : "No stock record"
            }
          />
        </div>
      </div>

      {/* ── Stock Adjustment Card ── */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-surface-900 mb-4">
          Stock Adjustment
        </h2>
        <form onSubmit={handleStockAdjust} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdjustType("IN")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                adjustType === "IN"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shadow-sm"
                  : "bg-surface-50 text-surface-500 border-surface-300/60 hover:bg-surface-100"
              }`}
            >
              <Plus className="w-4 h-4" />
              Stock In
            </button>
            <button
              type="button"
              onClick={() => setAdjustType("OUT")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                adjustType === "OUT"
                  ? "bg-red-500/10 text-red-600 border-red-500/30 shadow-sm"
                  : "bg-surface-50 text-surface-500 border-surface-300/60 hover:bg-surface-100"
              }`}
            >
              <Minus className="w-4 h-4" />
              Stock Out
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-surface-600">
                Quantity <span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                min="1"
                required
                placeholder="Enter quantity"
                className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] text-sm bg-white border border-surface-300/70 text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-all duration-200"
              />
            </div>

            {adjustType === "IN" && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-600">
                    Batch No.
                  </label>
                  <input
                    type="text"
                    value={adjustBatch}
                    onChange={(e) => setAdjustBatch(e.target.value)}
                    placeholder="e.g. BATCH-2024-001"
                    className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] text-sm bg-white border border-surface-300/70 text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-all duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-surface-600">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={adjustExpiry}
                    onChange={(e) => setAdjustExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] text-sm bg-white border border-surface-300/70 text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-all duration-200"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={adjusting}>
              {adjustType === "IN" ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {adjustType === "IN" ? "Add Stock" : "Remove Stock"}
            </Button>
          </div>
        </form>
      </div>

      {/* ── Batches Table ── */}
      {medicine.batches && medicine.batches.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-200/70">
            <h2 className="text-lg font-semibold text-surface-900">
              Medicine Batches
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-300/50 bg-surface-100/70">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    Batch No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200/70">
                {medicine.batches.map((batch) => {
                  const isExpired =
                    batch.expiryDate &&
                    new Date(batch.expiryDate) < new Date();
                  return (
                    <tr key={batch.batchId}>
                      <td className="px-4 py-3 text-surface-700 font-medium">
                        {batch.batchNo || "—"}
                      </td>
                      <td className="px-4 py-3 text-surface-700">
                        {batch.quantity ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-surface-700">
                        {batch.expiryDate
                          ? new Date(batch.expiryDate).toLocaleDateString(
                              "en-IN",
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border bg-red-500/15 text-red-500 border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Inventory Log ── */}
      {medicine.inventoryLogs && medicine.inventoryLogs.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-200/70">
            <h2 className="text-lg font-semibold text-surface-900">
              Inventory Log
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-300/50 bg-surface-100/70">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200/70">
                {medicine.inventoryLogs.map((log) => (
                  <tr key={log.logId}>
                    <td className="px-4 py-3 text-surface-700">
                      {log.date
                        ? new Date(log.date).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.changeType === "IN" ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Stock In
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-500 font-medium">
                          <TrendingDown className="w-3.5 h-3.5" />
                          Stock Out
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-700 font-medium">
                      {log.changeType === "IN" ? "+" : "-"}
                      {log.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
