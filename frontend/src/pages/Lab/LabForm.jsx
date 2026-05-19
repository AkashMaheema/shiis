import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import labService from "../../api/services/labService";
import FormSelect from "../../components/common/FormSelect";
import FormInput from "../../components/common/FormInput";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

const initialForm = {
  patientId: "",
  doctorId: "",
  testId: "",
  requestDate: "",
};

const formatDoctorName = (firstName, lastName) => {
  const cleanFirst = String(firstName || "").replace(/^dr\.?\s*/i, "").trim();
  const cleanLast = String(lastName || "").trim();
  return `Dr. ${`${cleanFirst} ${cleanLast}`.trim()}`;
};

export default function LabForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [tests, setTests] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Load lookups
  useEffect(() => {
    setLoadingLookups(true);
    Promise.all([
      labService.getPatients(),
      labService.getDoctors(),
      labService.getTests(),
    ])
      .then(([pts, docs, tst]) => {
        setPatients(pts || []);
        setDoctors(docs || []);
        setTests(tst || []);
      })
      .catch(() => toast.error("Failed to load form lookups."))
      .finally(() => setLoadingLookups(false));
  }, []);

  // Load existing request for edit
  useEffect(() => {
    if (isEdit) {
      setFetching(true);
      labService
        .getRequest(id)
        .then((req) => {
          setForm({
            patientId: req.patientId ?? "",
            doctorId: req.doctorId ?? "",
            testId: req.testId ?? "",
            requestDate: req.requestDate
              ? new Date(req.requestDate).toISOString().slice(0, 10)
              : "",
          });
        })
        .catch(() => {
          toast.error("Failed to load lab request.");
        })
        .finally(() => setFetching(false));
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.patientId) errs.patientId = "Patient is required";
    if (!form.doctorId) errs.doctorId = "Doctor is required";
    if (!form.testId) errs.testId = "Test is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        patientId: Number(form.patientId),
        doctorId: Number(form.doctorId),
        testId: Number(form.testId),
      };
      if (form.requestDate) payload.requestDate = form.requestDate;

      if (isEdit) {
        await labService.updateRequest(id, payload);
        toast.success("Lab request updated successfully!");
      } else {
        await labService.createRequest(payload);
        toast.success("Lab request created successfully!");
        setForm(initialForm);
      }
      setTimeout(() => navigate("/lab"), 800);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setLoading(false);
    }
  };

  const patientOptions = patients.map((p) => ({
    value: p.patientId,
    label: `${p.firstName} ${p.lastName} (#${p.patientId})`,
  }));
  const doctorOptions = doctors.map((d) => ({
    value: d.doctorId,
    label: `${formatDoctorName(d.firstName, d.lastName)} (#${d.doctorId})`,
  }));
  const testOptions = tests.map((t) => ({
    value: t.testId,
    label: `${t.testName}${t.price != null ? ` — Rs. ${Number(t.price).toFixed(2)}` : ""}`,
  }));

  if (fetching) return <Loader text="Loading lab request..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/lab")}
          className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            {isEdit ? "Edit Lab Request" : "New Lab Request"}
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {isEdit
              ? "Update lab request details"
              : "Order a new lab test for a patient"}
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
            placeholder={
              loadingLookups ? "Loading patients..." : "Select patient..."
            }
          />
          <FormSelect
            label="Referring Doctor"
            name="doctorId"
            value={form.doctorId}
            onChange={handleChange}
            options={doctorOptions}
            error={errors.doctorId}
            required
            placeholder={
              loadingLookups ? "Loading doctors..." : "Select doctor..."
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormSelect
            label="Lab Test"
            name="testId"
            value={form.testId}
            onChange={handleChange}
            options={testOptions}
            error={errors.testId}
            required
            placeholder={
              loadingLookups ? "Loading tests..." : "Select test..."
            }
          />
          <FormInput
            label="Request Date"
            name="requestDate"
            type="date"
            value={form.requestDate}
            onChange={handleChange}
            error={errors.requestDate}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-surface-200/60">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/lab")}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4" />
            {isEdit ? "Update Request" : "Create Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
