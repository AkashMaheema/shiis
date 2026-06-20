import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import prescriptionService from "../../api/services/prescriptionService";
import Button from "../../components/common/Button";
import FormInput from "../../components/common/FormInput";
import FormSelect from "../../components/common/FormSelect";
import Loader from "../../components/common/Loader";
import { useAuth } from "../../contexts/useAuth";

const emptyItem = { medicineId: "", dosage: "", quantity: 1 };
const initialForm = {
  patientId: "",
  patientName: "",
  appointmentId: "",
  notes: "",
  items: [{ ...emptyItem }],
};

function formatDoctorName(row) {
  const first = String(row.doctorFirstName || "").replace(/^dr\.?\s*/i, "").trim();
  return `Dr. ${`${first} ${row.doctorLastName || ""}`.trim()}`;
}

export default function PrescriptionForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const roleName = user?.roleName?.toLowerCase();
  const isAdmin = roleName === "admin";
  const isDoctor = roleName === "doctor";
  const currentDoctorId =
    user?.doctorId ?? (isDoctor && user?.username === "doctor" ? 1 : null);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const prefillAppointmentId = location.state?.appointmentId;
  const prefillPatientId = location.state?.patientId;
  const prefillPatientName = location.state?.patientName;

  const visibleAppointments =
    isDoctor && !isAdmin
      ? appointments.filter((a) => Number(a.doctorId) === Number(currentDoctorId))
      : appointments;

  useEffect(() => {
    setLoadingLookups(true);
    Promise.all([
      prescriptionService.getAppointments(),
      prescriptionService.getMedicines(),
    ])
      .then(([appts, meds]) => {
        setAppointments(appts || []);
        setMedicines(meds || []);
      })
      .catch(() => toast.error("Failed to load prescription lookups."))
      .finally(() => setLoadingLookups(false));
  }, []);

  useEffect(() => {
    if (isEdit || !prefillAppointmentId) return;
    setForm((prev) => ({
      ...prev,
      appointmentId: String(prefillAppointmentId),
    }));
  }, [isEdit, prefillAppointmentId]);

  useEffect(() => {
    if (isEdit || !prefillPatientId || prefillAppointmentId) return;
    setForm((prev) => ({
      ...prev,
      patientId: prefillPatientId,
      patientName: prefillPatientName || prev.patientName,
    }));
  }, [isEdit, prefillPatientId, prefillPatientName, prefillAppointmentId]);

  useEffect(() => {
    if (!form.appointmentId || form.patientName) return;
    const appointment = visibleAppointments.find(
      (a) => Number(a.appointmentId) === Number(form.appointmentId),
    );
    if (!appointment) return;
    setForm((prev) => ({
      ...prev,
      patientId: appointment.patientId ?? "",
      patientName: `${appointment.patientFirstName} ${appointment.patientLastName} (#${appointment.patientId})`,
    }));
  }, [form.appointmentId, form.patientName, visibleAppointments]);

  useEffect(() => {
    if (!isEdit) return;
    setFetching(true);
    prescriptionService
      .getById(id)
      .then((rx) => {
        if (
          isDoctor &&
          !isAdmin &&
          currentDoctorId &&
          Number(rx.doctor?.doctorId) !== Number(currentDoctorId)
        ) {
          toast.error("You can only edit your own prescriptions.");
          navigate("/prescriptions");
          return;
        }
        setForm({
          patientId: rx.patient?.patientId ?? "",
          patientName: rx.patient
            ? `${rx.patient.firstName} ${rx.patient.lastName} (#${rx.patient.patientId})`
            : "",
          appointmentId: rx.appointmentId ?? "",
          notes: rx.notes || "",
          items:
            rx.items?.length > 0
              ? rx.items.map((item) => ({
                  medicineId: item.medicineId,
                  dosage: item.dosage || "",
                  quantity: item.quantity || 1,
                }))
              : [{ ...emptyItem }],
        });
      })
      .catch(() => toast.error("Failed to load prescription."))
      .finally(() => setFetching(false));
  }, [id, isEdit, isDoctor, isAdmin, currentDoctorId, navigate]);

  const medicineMap = useMemo(() => {
    const map = {};
    medicines.forEach((medicine) => {
      map[medicine.medicineId] = medicine;
    });
    return map;
  }, [medicines]);

  const total = useMemo(
    () =>
      form.items.reduce((sum, item) => {
        const medicine = medicineMap[item.medicineId];
        return sum + Number(item.quantity || 0) * Number(medicine?.unitPrice || 0);
      }, 0),
    [form.items, medicineMap],
  );

  const appointmentOptions = visibleAppointments.map((a) => ({
    value: a.appointmentId,
    label: `#${a.appointmentId} - ${a.patientFirstName} ${a.patientLastName} - ${new Date(a.appointmentDate).toLocaleDateString("en-IN")} - ${formatDoctorName(a)}`,
  }));

  const filteredAppointmentOptions = visibleAppointments
    .filter((a) => !form.patientId || Number(a.patientId) === Number(form.patientId))
    .map((a) => ({
      value: a.appointmentId,
      label: `#${a.appointmentId} - ${a.patientFirstName} ${a.patientLastName} - ${new Date(a.appointmentDate).toLocaleDateString("en-IN")} - ${formatDoctorName(a)}`,
    }));

  const medicineOptions = medicines.map((m) => ({
    value: m.medicineId,
    label: `${m.name}${m.unitPrice != null ? ` - Rs. ${Number(m.unitPrice).toFixed(2)}` : ""}`,
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "appointmentId") {
      const appointment = visibleAppointments.find(
        (a) => Number(a.appointmentId) === Number(value),
      );
      setForm((prev) => ({
        ...prev,
        appointmentId: value,
        patientId: appointment?.patientId ?? "",
        patientName: appointment
          ? `${appointment.patientFirstName} ${appointment.patientLastName} (#${appointment.patientId})`
          : "",
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
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
    if (!form.appointmentId) errs.appointmentId = "Appointment is required";
    form.items.forEach((item, index) => {
      if (!item.medicineId) errs[`medicine-${index}`] = "Medicine is required";
      if (Number(item.quantity) < 1) errs[`quantity-${index}`] = "Quantity must be at least 1";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      appointmentId: Number(form.appointmentId),
      notes: form.notes || undefined,
      items: form.items.map((item) => ({
        medicineId: Number(item.medicineId),
        dosage: item.dosage || undefined,
        quantity: Number(item.quantity || 1),
      })),
    };

    setSaving(true);
    try {
      const rx = isEdit
        ? await prescriptionService.update(id, payload)
        : await prescriptionService.create(payload);
      toast.success(
        isEdit
          ? "Prescription updated and billing synced."
          : "Prescription created and billing synced.",
      );
      navigate(`/prescriptions/${rx.prescriptionId}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong. Please try again.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) return <Loader text="Loading prescription..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/prescriptions")}
          className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            {isEdit ? "Edit Prescription" : "New Prescription"}
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {isEdit
              ? "Update medicines and billing charges"
              : "Issue medicines for a patient appointment"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormInput
            label="Patient"
            name="patientName"
            value={form.patientName}
            onChange={() => {}}
            placeholder={
              loadingLookups ? "Loading patient..." : "Auto-filled from appointment"
            }
            disabled
          />
          <FormSelect
            label="Appointment"
            name="appointmentId"
            value={form.appointmentId}
            onChange={handleChange}
            options={form.patientId ? filteredAppointmentOptions : appointmentOptions}
            error={errors.appointmentId}
            required
            placeholder={
              loadingLookups ? "Loading appointments..." : "Select appointment..."
            }
          />
        </div>

        <FormInput
          label="Notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Diagnosis notes or patient instructions"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-700">
              Medicines
            </h2>
            <Button type="button" variant="secondary" size="sm" onClick={addItem}>
              <Plus className="w-3.5 h-3.5" />
              Add Medicine
            </Button>
          </div>

          {form.items.map((item, index) => {
            const selected = medicineMap[item.medicineId];
            const lineTotal =
              Number(item.quantity || 0) * Number(selected?.unitPrice || 0);
            return (
              <div
                key={index}
                className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_110px_120px_44px] gap-3 items-start"
              >
                <FormSelect
                  label={index === 0 ? "Medicine" : ""}
                  name={`medicine-${index}`}
                  value={item.medicineId}
                  onChange={(e) =>
                    handleItemChange(index, "medicineId", e.target.value)
                  }
                  options={medicineOptions}
                  error={errors[`medicine-${index}`]}
                  required
                  placeholder={
                    loadingLookups ? "Loading medicines..." : "Select medicine..."
                  }
                />
                <FormInput
                  label={index === 0 ? "Dosage" : ""}
                  name={`dosage-${index}`}
                  value={item.dosage}
                  onChange={(e) =>
                    handleItemChange(index, "dosage", e.target.value)
                  }
                  placeholder="1 tablet twice daily"
                />
                <FormInput
                  label={index === 0 ? "Qty" : ""}
                  name={`quantity-${index}`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    handleItemChange(index, "quantity", e.target.value)
                  }
                  error={errors[`quantity-${index}`]}
                />
                <div className={index === 0 ? "pt-7" : ""}>
                  <div className="px-3.5 py-2.5 rounded-[var(--radius-input)] bg-surface-50 border border-surface-200/70 text-sm text-surface-700">
                    Rs. {lineTotal.toFixed(2)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={form.items.length === 1}
                  className={`p-2.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ${
                    index === 0 ? "lg:mt-7" : ""
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                  title="Remove medicine"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-surface-200/60">
          <p className="text-sm text-surface-500">
            Prescription billable total:{" "}
            <span className="font-bold text-surface-900">
              Rs. {total.toFixed(2)}
            </span>
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/prescriptions")}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="w-4 h-4" />
              {isEdit ? "Update Prescription" : "Create Prescription"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
