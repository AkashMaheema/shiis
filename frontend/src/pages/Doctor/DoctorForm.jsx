import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import { toast } from "react-toastify";
import doctorService from "../../api/services/doctorService";
import Button from "../../components/common/Button";
import FormInput from "../../components/common/FormInput";
import Loader from "../../components/common/Loader";

const initialForm = {
  firstName: "",
  lastName: "",
  specialization: "",
  phone: "",
  email: "",
  address: "",
  username: "",
  password: "",
};

function makeUsername(firstName, lastName) {
  return `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function DoctorForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    setFetching(true);
    doctorService
      .getById(id)
      .then((doctor) => {
        setForm({
          firstName: doctor.firstName || "",
          lastName: doctor.lastName || "",
          specialization: doctor.specialization || "",
          phone: doctor.phone || "",
          email: doctor.email || "",
          address: doctor.address || "",
          username: doctor.username || "",
          password: "",
        });
      })
      .catch(() => {
        toast.error("Failed to load doctor data.");
        navigate("/doctors");
      })
      .finally(() => setFetching(false));
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (!isEdit && (name === "firstName" || name === "lastName")) {
        const currentAuto = makeUsername(prev.firstName, prev.lastName);
        if (!prev.username || prev.username === currentAuto) {
          next.username = makeUsername(next.firstName, next.lastName);
        }
      }
      return next;
    });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Invalid email address";
    }
    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone)) {
      errs.phone = "Invalid phone number";
    }
    if (!form.username.trim()) errs.username = "Username is required";
    if (!isEdit && form.password.length < 6) {
      errs.password = "Password must be at least 6 characters";
    }
    if (isEdit && form.password && form.password.length < 6) {
      errs.password = "Password must be at least 6 characters";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;

      if (isEdit) {
        await doctorService.update(id, payload);
        toast.success("Doctor updated successfully!");
      } else {
        await doctorService.create(payload);
        toast.success("Doctor and doctor login created successfully!");
        setForm(initialForm);
      }
      setTimeout(() => navigate("/doctors"), 1000);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <Loader text="Loading doctor data..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/doctors")}
          className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            {isEdit ? "Edit Doctor" : "Register New Doctor"}
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {isEdit
              ? "Update doctor profile and login details"
              : "Create a doctor profile with a Doctor role login"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="First Name"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            error={errors.firstName}
            required
            placeholder="Asha"
          />
          <FormInput
            label="Last Name"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            error={errors.lastName}
            required
            placeholder="Perera"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Specialization"
            name="specialization"
            value={form.specialization}
            onChange={handleChange}
            error={errors.specialization}
            placeholder="Cardiology"
          />
          <FormInput
            label="Phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            error={errors.phone}
            placeholder="+94 771234567"
          />
        </div>

        <div>
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="doctor@example.com"
          />
        </div>

        <FormInput
          label="Address"
          name="address"
          value={form.address}
          onChange={handleChange}
          error={errors.address}
          placeholder="123 Main Street, City"
        />

        <div className="pt-4 border-t border-surface-200/60">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-semibold text-surface-900">
              Doctor Login
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="Username"
              name="username"
              value={form.username}
              onChange={handleChange}
              error={errors.username}
              required
              placeholder="ashaperera"
            />
            <FormInput
              label={isEdit ? "New Password" : "Password"}
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              required={!isEdit}
              placeholder={isEdit ? "Leave blank to keep current password" : ""}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-surface-200/60">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/doctors")}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4" />
            {isEdit ? "Update Doctor" : "Register Doctor"}
          </Button>
        </div>
      </form>
    </div>
  );
}
