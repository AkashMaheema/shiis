import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PackageCheck, Calendar, Hash } from "lucide-react";
import { toast } from "react-toastify";
import stockInService from "../../api/services/stockInService";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const inputCls =
  "w-full px-3 py-2.5 rounded-lg bg-white border border-surface-300/60 text-sm text-surface-800 placeholder-surface-400 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all";

export default function StockInReceive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Per-item receive data: { receivedQty, batchNo, expiryDate, costPrice }
  const [receiveData, setReceiveData] = useState({});

  useEffect(() => {
    stockInService
      .getById(id)
      .then((data) => {
        if (data.status === "Received") {
          toast.info("This order has already been received.");
          navigate(`/stock-in/${id}`);
          return;
        }
        if (data.status === "Cancelled") {
          toast.error("Cannot receive a cancelled order.");
          navigate(`/stock-in/${id}`);
          return;
        }
        setPo(data);
        // Pre-fill with ordered qty
        const init = {};
        data.items.forEach((item) => {
          init[item.poItemId] = {
            receivedQty: item.quantity ?? 0,
            batchNo: "",
            expiryDate: "",
            costPrice: item.costPrice ?? "",
          };
        });
        setReceiveData(init);
      })
      .catch(() => {
        toast.error("Failed to load order.");
        navigate("/stock-in");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const updateField = (poItemId, field, value) =>
    setReceiveData((prev) => ({
      ...prev,
      [poItemId]: { ...prev[poItemId], [field]: value },
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const items = (po?.items ?? []).map((item) => {
      const d = receiveData[item.poItemId] ?? {};
      return {
        poItemId: item.poItemId,
        medicineId: item.medicineId,
        receivedQty: Number(d.receivedQty ?? 0),
        batchNo: d.batchNo || undefined,
        expiryDate: d.expiryDate || undefined,
        costPrice: d.costPrice ? Number(d.costPrice) : undefined,
      };
    });

    if (items.every((i) => i.receivedQty === 0)) {
      return toast.error("At least one item must have a received quantity > 0.");
    }

    setSaving(true);
    try {
      await stockInService.receive(id, { items });
      toast.success("Stock received and updated successfully! 🎉");
      navigate(`/stock-in/${id}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to receive stock.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Loading order items..." />;
  if (!po) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(`/stock-in/${id}`)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Order
        </button>
        <div className="flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-primary-500" />
          <h1 className="text-xl font-bold text-surface-900">
            Receive Stock — PO #{po.poId}
          </h1>
        </div>
      </div>

      {/* Info banner */}
      <div className="glass-card p-4 flex items-center gap-3 border-l-4 border-l-primary-500">
        <PackageCheck className="w-5 h-5 text-primary-500 shrink-0" />
        <p className="text-sm text-surface-700">
          Enter the <strong>received quantity</strong>, <strong>batch number</strong> and{" "}
          <strong>expiry date</strong> for each item. Leave quantity as 0 to skip an item.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {(po.items ?? []).map((item) => {
          const d = receiveData[item.poItemId] ?? {};
          return (
            <div key={item.poItemId} className="glass-card p-5 space-y-4">
              {/* Item header */}
              <div className="flex items-center gap-3 pb-3 border-b border-surface-200/60">
                <div className="w-9 h-9 rounded-xl bg-primary-50 border border-primary-200/60 flex items-center justify-center shrink-0">
                  <Hash className="w-4 h-4 text-primary-500" />
                </div>
                <div>
                  <p className="font-semibold text-surface-900">
                    Medicine #{item.medicineId}
                  </p>
                  <p className="text-xs text-surface-500">
                    Ordered: <strong>{item.quantity}</strong> units
                    {item.costPrice != null && (
                      <> &bull; Unit price: <strong>₹{Number(item.costPrice).toFixed(2)}</strong></>
                    )}
                  </p>
                </div>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Received Qty */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-surface-600 uppercase tracking-wide">
                    Received Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={d.receivedQty ?? ""}
                    onChange={(e) => updateField(item.poItemId, "receivedQty", e.target.value)}
                    className={inputCls}
                    required
                  />
                  <p className="text-xs text-surface-400">Max: {item.quantity}</p>
                </div>

                {/* Batch No */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-surface-600 uppercase tracking-wide">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BCH-2026-001"
                    value={d.batchNo ?? ""}
                    onChange={(e) => updateField(item.poItemId, "batchNo", e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Expiry Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-surface-600 uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={d.expiryDate ?? ""}
                    onChange={(e) => updateField(item.poItemId, "expiryDate", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className={inputCls}
                  />
                </div>

                {/* Cost Price override */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-surface-600 uppercase tracking-wide">
                    Cost / Unit (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={item.costPrice ?? "0.00"}
                    value={d.costPrice ?? ""}
                    onChange={(e) => updateField(item.poItemId, "costPrice", e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Line total preview */}
              {d.receivedQty > 0 && d.costPrice && (
                <p className="text-xs text-surface-500 text-right">
                  Line total:{" "}
                  <strong className="text-surface-800">
                    ₹{(Number(d.receivedQty) * Number(d.costPrice)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                </p>
              )}
            </div>
          );
        })}

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/stock-in/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            <PackageCheck className="w-4 h-4" />
            Confirm Receipt
          </Button>
        </div>
      </form>
    </div>
  );
}
