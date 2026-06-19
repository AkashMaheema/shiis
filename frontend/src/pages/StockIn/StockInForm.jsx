import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import { toast } from "react-toastify";
import stockInService from "../../api/services/stockInService";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import api from "../../api/axiosInstance";

function FormField({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-surface-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg bg-white border border-surface-300/60 text-sm text-surface-800 placeholder-surface-400 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all";

const emptyItem = () => ({
  medicineId: "",
  quantity: "",
  costPrice: "",
  notes: "",
});

export default function StockInForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loadingPage, setLoadingPage] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    supplierId: "",
    orderDate: new Date().toISOString().split("T")[0],
    status: "Draft",
    notes: "",
  });
  const [items, setItems] = useState([emptyItem()]);

  // Load suppliers and medicines
  useEffect(() => {
    api.get("/suppliers?limit=200").then((r) => setSuppliers(r.data?.data ?? [])).catch(() => {});
    api.get("/medicines?limit=500").catch(() => {}).then((r) => {
      if (r?.data) setMedicines(Array.isArray(r.data) ? r.data : r.data?.data ?? []);
    });
  }, []);

  // Load existing PO in edit mode
  useEffect(() => {
    if (!isEdit) return;
    stockInService
      .getById(id)
      .then((po) => {
        setForm({
          supplierId: po.supplierId ?? "",
          orderDate: po.orderDate ? po.orderDate.split("T")[0] : "",
          status: po.status ?? "Draft",
          notes: po.notes ?? "",
        });
        if (po.items?.length) {
          setItems(
            po.items.map((i) => ({
              medicineId: i.medicineId ?? "",
              quantity: i.quantity ?? "",
              costPrice: i.costPrice ?? "",
              notes: i.notes ?? "",
            }))
          );
        }
      })
      .catch(() => {
        toast.error("Failed to load order.");
        navigate("/stock-in");
      })
      .finally(() => setLoadingPage(false));
  }, [id, isEdit, navigate]);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) =>
    setItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const updateItem = (idx, field, value) =>
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );

  const totalAmount = items.reduce(
    (sum, i) => sum + (parseFloat(i.costPrice) || 0) * (parseInt(i.quantity) || 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplierId) return toast.error("Please select a supplier.");
    if (items.some((i) => !i.medicineId || !i.quantity))
      return toast.error("All items must have a medicine and quantity.");

    setSaving(true);
    try {
      const payload = {
        supplierId: Number(form.supplierId),
        orderDate: form.orderDate || undefined,
        status: form.status,
        notes: form.notes || undefined,
        items: items.map((i) => ({
          medicineId: Number(i.medicineId),
          quantity: Number(i.quantity),
          costPrice: i.costPrice ? Number(i.costPrice) : undefined,
          notes: i.notes || undefined,
        })),
      };

      if (isEdit) {
        await stockInService.update(id, payload);
        toast.success("Order updated successfully.");
      } else {
        const created = await stockInService.create(payload);
        toast.success("Purchase order created!");
        navigate(`/stock-in/${created.poId}`);
        return;
      }
      navigate(`/stock-in/${id}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save order.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingPage) return <Loader text="Loading order..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(isEdit ? `/stock-in/${id}` : "/stock-in")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEdit ? "Back to Order" : "Back to Stock In"}
        </button>
        <h1 className="text-xl font-bold text-surface-900">
          {isEdit ? `Edit PO #${id}` : "New Purchase Order"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header card */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-base font-semibold text-surface-800 border-b border-surface-200/60 pb-3">
            Order Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField label="Supplier" required>
              <select
                value={form.supplierId}
                onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
                className={inputCls}
                required
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.supplierId} value={s.supplierId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Order Date">
              <input
                type="date"
                value={form.orderDate}
                onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))}
                className={inputCls}
              />
            </FormField>

            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className={inputCls}
              >
                <option value="Draft">Draft</option>
                <option value="Pending">Pending</option>
              </select>
            </FormField>

            <FormField label="Notes">
              <input
                type="text"
                placeholder="Remarks or reference number..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className={inputCls}
              />
            </FormField>
          </div>
        </div>

        {/* Items card */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-surface-200/60 pb-3">
            <h2 className="text-base font-semibold text-surface-800">
              Order Items
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 border border-primary-300/50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          {/* Table header */}
          <div className="hidden sm:grid grid-cols-12 gap-3 text-xs font-medium text-surface-500 uppercase tracking-wide px-1">
            <span className="col-span-4">Medicine</span>
            <span className="col-span-2">Qty</span>
            <span className="col-span-2">Cost/Unit (₹)</span>
            <span className="col-span-3">Notes</span>
            <span className="col-span-1"></span>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-3 items-center p-2 rounded-lg bg-surface-50/60 border border-surface-200/40"
              >
                <div className="col-span-12 sm:col-span-4">
                  <select
                    value={item.medicineId}
                    onChange={(e) => updateItem(idx, "medicineId", e.target.value)}
                    className={inputCls}
                    required
                  >
                    <option value="">Select medicine...</option>
                    {medicines.map((m) => (
                      <option key={m.medicineId ?? m.medicine_id} value={m.medicineId ?? m.medicine_id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.costPrice}
                    onChange={(e) => updateItem(idx, "costPrice", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-11 sm:col-span-3">
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={item.notes}
                    onChange={(e) => updateItem(idx, "notes", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-50 transition-colors"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-end pt-3 border-t border-surface-200/60">
            <div className="text-right">
              <p className="text-xs text-surface-500 mb-0.5">Estimated Total</p>
              <p className="text-xl font-bold text-surface-900">
                ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(isEdit ? `/stock-in/${id}` : "/stock-in")}
          >
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4" />
            {isEdit ? "Save Changes" : "Create Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
