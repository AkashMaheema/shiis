import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import medicineService from "../../api/services/medicineService";
import FormInput from "../../components/common/FormInput";
import FormSelect from "../../components/common/FormSelect";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const categoryOptions = [
  { value: "Painkiller", label: "Painkiller" },
  { value: "Antibiotic", label: "Antibiotic" },
  { value: "Antiviral", label: "Antiviral" },
  { value: "Antifungal", label: "Antifungal" },
  { value: "Antiseptic", label: "Antiseptic" },
  { value: "Tablet", label: "Tablet" },
  { value: "Capsule", label: "Capsule" },
  { value: "Syrup", label: "Syrup" },
  { value: "Injection", label: "Injection" },
  { value: "Cream", label: "Cream" },
  { value: "Drops", label: "Drops" },
  { value: "Supplement", label: "Supplement" },
  { value: "Other", label: "Other" },
];

const initialForm = {
  name: "",
  category: "",
  unitPrice: "",
};

export default function MedicineForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Load existing medicine for edit
  useEffect(() => {
    if (isEdit) {
      setFetching(true);
      medicineService
        .getById(id)
        .then((medicine) => {
          setForm({
            name: medicine.name || "",
            category: medicine.category || "",
            unitPrice:
              medicine.unitPrice != null ? String(medicine.unitPrice) : "",
          });
        })
        .catch(() => {
          toast.error("Failed to load medicine data.");
        })
        .finally(() => setFetching(false));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Medicine name is required";
    if (form.unitPrice && (isNaN(Number(form.unitPrice)) || Number(form.unitPrice) < 0)) {
      errs.unitPrice = "Unit price must be a positive number";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category || undefined,
        unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
      };

      if (isEdit) {
        await medicineService.update(id, payload);
        toast.success("Medicine updated successfully!");
      } else {
        await medicineService.create(payload);
        toast.success("Medicine added successfully!");
        setForm(initialForm);
      }
      setTimeout(() => navigate("/inventory"), 1000);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <Loader text="Loading medicine data..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/inventory")}
          className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            {isEdit ? "Edit Medicine" : "Add New Medicine"}
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {isEdit
              ? "Update medicine information"
              : "Fill in the details to add a new medicine"}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        {/* Name */}
        <FormInput
          label="Medicine Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          required
          placeholder="e.g. Paracetamol"
        />

        {/* Category + Unit Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect
            label="Category"
            name="category"
            value={form.category}
            onChange={handleChange}
            options={categoryOptions}
            error={errors.category}
            placeholder="Select category..."
          />
          <FormInput
            label="Unit Price (Rs.)"
            name="unitPrice"
            type="number"
            value={form.unitPrice}
            onChange={handleChange}
            error={errors.unitPrice}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-surface-200/60">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/inventory")}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4" />
            {isEdit ? "Update Medicine" : "Add Medicine"}
          </Button>
        </div>
      </form>
    </div>
  );
}
