import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import supplierService from "../../api/services/supplierService";
import FormInput from "../../components/common/FormInput";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const initialForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "",
};

export default function SupplierForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Load existing supplier for edit
  useEffect(() => {
    if (isEdit) {
      setFetching(true);
      supplierService
        .getById(id)
        .then((supplier) => {
          setForm({
            name: supplier.name || "",
            contactPerson: supplier.contactPerson || "",
            phone: supplier.phone || "",
            email: supplier.email || "",
            address: supplier.address || "",
            city: supplier.city || "",
            country: supplier.country || "",
          });
        })
        .catch(() => {
          toast.error("Failed to load supplier data.");
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
    if (!form.name.trim()) errs.name = "Supplier name is required";
    if (
      form.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      errs.email = "Invalid email address";
    }
    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone)) {
      errs.phone = "Invalid phone number";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (isEdit) {
        await supplierService.update(id, form);
        toast.success("Supplier updated successfully!");
      } else {
        await supplierService.create(form);
        toast.success("Supplier added successfully!");
        setForm(initialForm);
      }
      setTimeout(() => navigate("/suppliers"), 1000);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <Loader text="Loading supplier data..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/suppliers")}
          className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            {isEdit ? "Edit Supplier" : "Add New Supplier"}
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {isEdit
              ? "Update supplier information"
              : "Fill in the details to add a new supplier"}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        {/* Supplier Name */}
        <FormInput
          label="Supplier Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          required
          placeholder="e.g. Pharma Distributors Ltd."
        />

        {/* Contact Person + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Contact Person"
            name="contactPerson"
            value={form.contactPerson}
            onChange={handleChange}
            error={errors.contactPerson}
            placeholder="e.g. Rajesh Kumar"
          />
          <FormInput
            label="Phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            error={errors.phone}
            placeholder="+91 9876543210"
          />
        </div>

        {/* Email + Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="contact@supplier.com"
          />
          <FormInput
            label="Address"
            name="address"
            value={form.address}
            onChange={handleChange}
            error={errors.address}
            placeholder="123 Industrial Area"
          />
        </div>

        {/* City + Country */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="City"
            name="city"
            value={form.city}
            onChange={handleChange}
            error={errors.city}
            placeholder="Mumbai"
          />
          <FormInput
            label="Country"
            name="country"
            value={form.country}
            onChange={handleChange}
            error={errors.country}
            placeholder="India"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-surface-200/60">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/suppliers")}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4" />
            {isEdit ? "Update Supplier" : "Add Supplier"}
          </Button>
        </div>
      </form>
    </div>
  );
}
