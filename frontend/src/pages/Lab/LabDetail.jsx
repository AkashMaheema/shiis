import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  User,
  Stethoscope,
  Calendar,
  Hash,
  Beaker,
  CheckCircle2,
  Save,
  Trash2,
} from "lucide-react";
import labService from "../../api/services/labService";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
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

export default function LabDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const [resultDetails, setResultDetails] = useState("");
  const [resultDate, setResultDate] = useState("");
  const [savingResult, setSavingResult] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingResult, setDeletingResult] = useState(false);

  const load = () => {
    setLoading(true);
    labService
      .getRequest(id)
      .then((req) => {
        setRequest(req);
        if (req.result) {
          setResultDetails(req.result.resultDetails || "");
          setResultDate(
            req.result.resultDate
              ? new Date(req.result.resultDate).toISOString().slice(0, 10)
              : "",
          );
        } else {
          setResultDetails("");
          setResultDate(new Date().toISOString().slice(0, 10));
        }
      })
      .catch(() => {
        toast.error("Failed to load lab request.");
        navigate("/lab");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id, navigate]);

  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!resultDetails.trim()) {
      toast.error("Result details are required.");
      return;
    }
    setSavingResult(true);
    try {
      await labService.saveResult(id, {
        resultDetails: resultDetails.trim(),
        ...(resultDate ? { resultDate } : {}),
      });
      toast.success("Lab result saved.");
      load();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save result.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSavingResult(false);
    }
  };

  const handleDeleteResult = async () => {
    if (!request?.result) return;
    setDeletingResult(true);
    try {
      await labService.deleteResult(request.result.resultId);
      toast.success("Result removed.");
      setConfirmDelete(false);
      load();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to delete result.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeletingResult(false);
    }
  };

  if (loading) return <Loader text="Loading lab request..." />;
  if (!request) return null;

  const patient = request.patient;
  const doctor = request.doctor;
  const test = request.test;
  const completed = Boolean(request.result);

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : "Unknown";
  const patientInitials = patient
    ? (patient.firstName?.[0] ?? "") + (patient.lastName?.[0] ?? "")
    : "?";

  const requestDateFormatted = request.requestDate
    ? new Date(request.requestDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/lab")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lab
        </button>

        <Button size="sm" onClick={() => navigate(`/lab/${id}/edit`)}>
          <Edit3 className="w-3.5 h-3.5" />
          Edit Request
        </Button>
      </div>

      {/* Header Card */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between gap-5 mb-6 pb-6 border-b border-surface-200/60">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center text-2xl font-bold text-primary-600 shrink-0">
              {patientInitials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900">
                {patientName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1.5 text-sm text-surface-500">
                  <Beaker className="w-4 h-4 text-accent-500" />
                  {test?.testName || "—"}
                </span>
                {doctor && (
                  <>
                    <span className="text-surface-300">·</span>
                    <span className="flex items-center gap-1.5 text-sm text-surface-500">
                      <Stethoscope className="w-4 h-4 text-accent-500" />
                      Dr. {doctor.firstName} {doctor.lastName}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <StatusBadge
            status={completed ? "completed" : "pending"}
            label={completed ? "Completed" : "Pending"}
          />
        </div>

        <div>
          <DetailRow
            icon={<Hash className="w-4 h-4 text-primary-500" />}
            label="Request ID"
            value={`#${request.requestId}`}
          />
          <DetailRow
            icon={<User className="w-4 h-4 text-primary-500" />}
            label="Patient"
            value={
              patient
                ? `${patient.firstName} ${patient.lastName} (#${patient.patientId})`
                : null
            }
          />
          <DetailRow
            icon={<Stethoscope className="w-4 h-4 text-primary-500" />}
            label="Referring Doctor"
            value={
              doctor
                ? `Dr. ${doctor.firstName} ${doctor.lastName} (#${doctor.doctorId})`
                : null
            }
          />
          <DetailRow
            icon={<Beaker className="w-4 h-4 text-primary-500" />}
            label="Test"
            value={
              test
                ? `${test.testName}${
                    test.price != null
                      ? ` — Rs. ${Number(test.price).toFixed(2)}`
                      : ""
                  }`
                : null
            }
          />
          <DetailRow
            icon={<Calendar className="w-4 h-4 text-primary-500" />}
            label="Request Date"
            value={requestDateFormatted}
          />
        </div>
      </div>

      {/* Result Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className={`w-5 h-5 ${
                completed ? "text-emerald-500" : "text-surface-300"
              }`}
            />
            <h2 className="text-lg font-bold text-surface-900">
              {completed ? "Lab Result" : "Enter Lab Result"}
            </h2>
          </div>
          {completed && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Remove result"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSaveResult} className="space-y-4">
          <div>
            <label
              htmlFor="resultDetails"
              className="block text-sm font-medium text-surface-600 mb-1.5"
            >
              Result Details <span className="text-red-400">*</span>
            </label>
            <textarea
              id="resultDetails"
              value={resultDetails}
              onChange={(e) => setResultDetails(e.target.value)}
              placeholder="Enter test findings, values, observations..."
              rows={4}
              maxLength={255}
              className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] text-sm bg-white border border-surface-300/70 text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-all duration-200 resize-none"
              required
            />
            <p className="text-xs text-surface-400 mt-1">
              {resultDetails.length}/255 characters
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="resultDate"
                className="block text-sm font-medium text-surface-600 mb-1.5"
              >
                Result Date
              </label>
              <input
                id="resultDate"
                type="date"
                value={resultDate}
                onChange={(e) => setResultDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[var(--radius-input)] text-sm bg-white border border-surface-300/70 text-surface-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-surface-200/60">
            <Button type="submit" loading={savingResult}>
              <Save className="w-4 h-4" />
              {completed ? "Update Result" : "Save Result"}
            </Button>
          </div>
        </form>
      </div>

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Remove Lab Result"
        size="sm"
      >
        <p className="text-sm text-surface-600 mb-6">
          Remove the recorded result for this lab request? The request itself
          will remain.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteResult}
            loading={deletingResult}
          >
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}
