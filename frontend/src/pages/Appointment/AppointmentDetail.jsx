import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  User,
  Stethoscope,
  Calendar,
  Clock,
  Hash,
  FileText,
  ClipboardList,
  Activity,
} from "lucide-react";
import appointmentService from "../../api/services/appointmentService";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import StatusBadge from "../../components/common/StatusBadge";
import { toast } from "react-toastify";
import labService from "../../api/services/labService";

const formatDoctorName = (firstName, lastName) => {
  const cleanFirst = String(firstName || "").replace(/^dr\.?\s*/i, "").trim();
  const cleanLast = String(lastName || "").trim();
  return `Dr. ${`${cleanFirst} ${cleanLast}`.trim()}`;
};

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

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [doctorMap, setDoctorMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appointmentService
      .getById(id)
      .then(setAppointment)
      .catch(() => {
        toast.error("Failed to load appointment details.");
        navigate("/appointments");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    labService
      .getDoctors()
      .then((rows) => {
        const map = {};
        (rows || []).forEach((d) => {
          map[d.doctorId] = formatDoctorName(d.firstName, d.lastName);
        });
        setDoctorMap(map);
      })
      .catch(() => {
        setDoctorMap({});
      });
  }, []);

  if (loading) return <Loader text="Loading appointment details..." />;
  if (!appointment) return null;

  const patient = appointment.patient;
  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : "Unknown";
  const patientInitials = patient
    ? (patient.firstName?.[0] ?? "") + (patient.lastName?.[0] ?? "")
    : "?";

  const dateFormatted = appointment.appointmentDate
    ? new Date(appointment.appointmentDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;
  const createdOnSource =
    appointment.createdAt || appointment.updatedAt || appointment.appointmentDate;
  const createdOnFormatted = createdOnSource
    ? new Date(createdOnSource).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Not available";

  const statusMap = {
    Scheduled: "booked",
    Booked: "booked",
    Completed: "completed",
    Cancelled: "cancelled",
    "No Show": "inactive",
  };

  const doctorName = appointment.doctorId
    ? doctorMap[appointment.doctorId] || `Doctor #${appointment.doctorId}`
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/appointments")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Appointments
        </button>

        <Button
          size="sm"
          onClick={() => navigate(`/appointments/${id}/edit`)}
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit Appointment
        </Button>
      </div>

      {/* ── Header Card ── */}
      <div className="glass-card p-6">
        {/* Patient + Status */}
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
                  <Stethoscope className="w-4 h-4 text-accent-500" />
                  {doctorName || "Not assigned"}
                </span>
                {patient?.phone && (
                  <>
                    <span className="text-surface-300">·</span>
                    <span className="text-sm text-surface-500">
                      {patient.phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <StatusBadge
            status={statusMap[appointment.status] || "active"}
            label={appointment.status}
          />
        </div>

        {/* Detail rows */}
        <div>
          <DetailRow
            icon={<Hash className="w-4 h-4 text-primary-500" />}
            label="Appointment ID"
            value={`#${appointment.appointmentId}`}
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
            label="Doctor"
            value={doctorName}
          />
          <DetailRow
            icon={<Calendar className="w-4 h-4 text-primary-500" />}
            label="Date"
            value={dateFormatted}
          />
          <DetailRow
            icon={<Clock className="w-4 h-4 text-primary-500" />}
            label="Time"
            value={appointment.appointmentTime}
          />
          <DetailRow
            icon={<Activity className="w-4 h-4 text-primary-500" />}
            label="Status"
            value={appointment.status}
          />
          <DetailRow
            icon={<FileText className="w-4 h-4 text-primary-500" />}
            label="Reason"
            value={appointment.reason}
          />
          <DetailRow
            icon={<ClipboardList className="w-4 h-4 text-primary-500" />}
            label="Notes"
            value={appointment.notes}
          />
          <DetailRow
            icon={<Calendar className="w-4 h-4 text-primary-500" />}
            label="Created On"
            value={createdOnFormatted}
          />
        </div>
      </div>
    </div>
  );
}
