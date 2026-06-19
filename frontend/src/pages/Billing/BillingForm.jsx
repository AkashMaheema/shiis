import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import billingService from "../../api/services/billingService";
import Button from "../../components/common/Button";
import FormInput from "../../components/common/FormInput";
import FormSelect from "../../components/common/FormSelect";
import Loader from "../../components/common/Loader";

const emptyItem = { description: "", quantity: 1, unitPrice: "" };
const initialForm = {
  patientId: "",
  appointmentId: "",
  notes: "",
  items: [{ ...emptyItem }],
};

export default function BillingForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingLookups(true);
    Promise.all([billingService.getPatients(), billingService.getAppointments()])
      .then(([pts, appts]) => {
        setPatients(pts || []);
        setAppointments(appts || []);
      })
      .catch(() => toast.error("Failed to load billing lookups."))
      .finally(() => setLoadingLookups(false));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setFetching(true);
    billingService
      .getById(id)
      .then((bill) => {
        setForm({
          patientId: bill.patientId ?? "",
          appointmentId: bill.appointmentId ?? "",
          notes: bill.notes || "",
          items:
            bill.items?.length > 0
              ? bill.items.map((item) => ({
                  description: item.description || "",
                  quantity: item.quantity || 1,
                  unitPrice:
                    item.unitPrice != null
                      ? item.unitPrice
                      : Number(item.amount || 0) / Number(item.quantity || 1),
                }))
              : [{ ...emptyItem }],
        });
      })
      .catch(() => toast.error("Failed to load bill."))
      .finally(() => setFetching(false));
  }, [id, isEdit]);

  const patientOptions = patients.map((p) => ({
    value: p.patientId,
    label: `${p.firstName} ${p.lastName} (#${p.patientId})`,
  }));

  const appointmentOptions = appointments.map((a) => ({
    value: a.appointmentId,
    label: `#${a.appointmentId} - ${a.firstName} ${a.lastName} - ${
      a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString("en-IN") : "No date"
    }`,
  }));

  const total = useMemo(
    () =>
      form.items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
      ),
    [form.items],
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const errs = {};
    if (!form.patientId) errs.patientId = "Patient is required";
    if (form.items.length === 0) errs.items = "At least one line item is required";
    form.items.forEach((item, index) => {
      if (!item.description.trim()) errs[`description-${index}`] = "Description is required";
      if (Number(item.quantity) < 1) errs[`quantity-${index}`] = "Quantity must be at least 1";
      if (Number(item.unitPrice) < 0) errs[`unitPrice-${index}`] = "Price cannot be negative";
      if (item.unitPrice === "") errs[`unitPrice-${index}`] = "Unit price is required";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGenerate = async () => {
    if (!form.appointmentId) {
      toast.error("Select an appointment first.");
      return;
    }
    setSaving(true);
    try {
      const bill = await billingService.generateFromAppointment(form.appointmentId);
      toast.success("Bill generated from appointment.");
      navigate(`/billing/${bill.billId}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to generate bill.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      patientId: Number(form.patientId),
      notes: form.notes || undefined,
      items: form.items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
      })),
    };
    if (form.appointmentId) payload.appointmentId = Number(form.appointmentId);

    setSaving(true);
    try {
      const bill = isEdit
        ? await billingService.update(id, payload)
        : await billingService.create(payload);
      toast.success(isEdit ? "Bill updated successfully!" : "Bill created successfully!");
      navigate(`/billing/${bill.billId}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong. Please try again.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) return <Loader text="Loading bill..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/billing")}
          className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            {isEdit ? "Edit Bill" : "New Bill"}
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {isEdit ? "Update invoice items" : "Create a patient invoice"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect
            label="Patient"
            name="patientId"
            value={form.patientId}
            onChange={handleChange}
            options={patientOptions}
            error={errors.patientId}
            required
            placeholder={loadingLookups ? "Loading patients..." : "Select patient..."}
          />
          <FormSelect
            label="Appointment"
            name="appointmentId"
            value={form.appointmentId}
            onChange={handleChange}
            options={appointmentOptions}
            placeholder={
              loadingLookups ? "Loading appointments..." : "Optional appointment..."
            }
          />
        </div>

        {!isEdit && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleGenerate}
              loading={saving}
              disabled={!form.appointmentId}
            >
              <Receipt className="w-4 h-4" />
              Generate From Appointment
            </Button>
          </div>
        )}

        <FormInput
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Optional billing notes"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-700">Line Items</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addItem}>
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </Button>
          </div>

          {form.items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-[1fr_110px_140px_44px] gap-3 items-start"
            >
              <FormInput
                label={index === 0 ? "Description" : ""}
                name={`description-${index}`}
                value={item.description}
                onChange={(e) =>
                  handleItemChange(index, "description", e.target.value)
                }
                error={errors[`description-${index}`]}
                placeholder="Consultation fee"
              />
              <FormInput
                label={index === 0 ? "Qty" : ""}
                name={`quantity-${index}`}
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                error={errors[`quantity-${index}`]}
              />
              <FormInput
                label={index === 0 ? "Unit Price" : ""}
                name={`unitPrice-${index}`}
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) =>
                  handleItemChange(index, "unitPrice", e.target.value)
                }
                error={errors[`unitPrice-${index}`]}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={form.items.length === 1}
                className={`p-2.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ${
                  index === 0 ? "md:mt-7" : ""
                } disabled:opacity-30 disabled:cursor-not-allowed`}
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-surface-200/60">
          <p className="text-sm text-surface-500">
            Total:{" "}
            <span className="font-bold text-surface-900">
              Rs. {total.toFixed(2)}
            </span>
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/billing")}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="w-4 h-4" />
              {isEdit ? "Update Bill" : "Create Bill"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
