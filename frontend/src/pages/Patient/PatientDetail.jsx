import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Hash,
  Venus,
  Mars,
  CircleUser,
  ClipboardList,
  FileText,
  Plus,
} from "lucide-react";
import patientService from "../../api/services/patientService";
import appointmentService from "../../api/services/appointmentService";
import prescriptionService from "../../api/services/prescriptionService";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/useAuth";

function genderIcon(gender) {
  if (gender === "Male") return <Mars className="w-4 h-4 text-blue-500" />;
  if (gender === "Female") return <Venus className="w-4 h-4 text-pink-500" />;
  return <CircleUser className="w-4 h-4 text-surface-400" />;
}

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

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

function EmptyState({ text }) {
  return (
    <div className="px-4 py-8 text-center text-sm text-surface-400">
      {text}
    </div>
  );
}

function formatDate(date) {
  return date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleName = user?.roleName?.toLowerCase();
  const isAdmin = roleName === "admin";
  const isDoctor = roleName === "doctor";
  const currentDoctorId =
    user?.doctorId ?? (isDoctor && user?.username === "doctor" ? 1 : null);
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientService
      .getById(id)
      .then(setPatient)
      .catch(() => {
        toast.error("Failed to load patient details.");
        navigate("/patients");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    const filters = { patientId: Number(id) };
    if (isDoctor && !isAdmin) filters.doctorId = currentDoctorId ?? -1;

    setRelatedLoading(true);
    Promise.all([
      appointmentService.getAll(1, 5, {
        ...filters,
        sortBy: "appointmentDate",
        sortOrder: "DESC",
      }),
      prescriptionService.getAll(1, 5, {
        ...filters,
        sortBy: "issuedDate",
        sortOrder: "DESC",
      }),
    ])
      .then(([apptResult, rxResult]) => {
        setAppointments(apptResult.data || []);
        setPrescriptions(rxResult.data || []);
      })
      .catch(() => {
        toast.error("Failed to load patient history.");
        setAppointments([]);
        setPrescriptions([]);
      })
      .finally(() => setRelatedLoading(false));
  }, [id, isDoctor, isAdmin, currentDoctorId]);

  if (loading) return <Loader text="Loading patient details..." />;
  if (!patient) return null;

  const age = calcAge(patient.dob);
  const dobFormatted = patient.dob
    ? new Date(patient.dob).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const initials =
    (patient.firstName?.[0] ?? "") + (patient.lastName?.[0] ?? "");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* -- Top bar -- */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/patients")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </button>

        <Button size="sm" onClick={() => navigate(`/patients/${id}/edit`)}>
          <Edit3 className="w-3.5 h-3.5" />
          Edit Patient
        </Button>
      </div>

      {/* -- Profile card -- */}
      <div className="glass-card p-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-surface-200/60">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center text-2xl font-bold text-primary-600 shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-sm text-surface-500">
                {genderIcon(patient.gender)}
                {patient.gender || "Unknown gender"}
              </span>
              {age !== null && (
                <>
                  <span className="text-surface-300">·</span>
                  <span className="text-sm text-surface-500">
                    {age} years old
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <div>
          <DetailRow
            icon={<Hash className="w-4 h-4 text-primary-500" />}
            label="Patient ID"
            value={`#${patient.patientId}`}
          />
          <DetailRow
            icon={<Calendar className="w-4 h-4 text-primary-500" />}
            label="Date of Birth"
            value={dobFormatted}
          />
          <DetailRow
            icon={<Phone className="w-4 h-4 text-primary-500" />}
            label="Phone"
            value={patient.phone}
          />
          <DetailRow
            icon={<Mail className="w-4 h-4 text-primary-500" />}
            label="Email"
            value={patient.email}
          />
          <DetailRow
            icon={<MapPin className="w-4 h-4 text-primary-500" />}
            label="Address"
            value={patient.address}
          />
          <DetailRow
            icon={<User className="w-4 h-4 text-primary-500" />}
            label="Registered On"
            value={
              patient.createdAt
                ? new Date(patient.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : null
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-200/70">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              <h2 className="text-sm font-semibold text-surface-900">
                Previous Appointments
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/appointments")}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              View all
            </button>
          </div>
          {relatedLoading ? (
            <div className="py-8">
              <Loader text="Loading appointments..." />
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState text="No appointments found" />
          ) : (
            <div className="divide-y divide-surface-200/70">
              {appointments.map((appointment) => (
                <button
                  key={appointment.appointmentId}
                  type="button"
                  onClick={() =>
                    navigate(`/appointments/${appointment.appointmentId}`)
                  }
                  className="w-full text-left px-5 py-4 hover:bg-primary-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-surface-900">
                        #{appointment.appointmentId} ·{" "}
                        {appointment.reason || "Appointment"}
                      </p>
                      <p className="text-xs text-surface-500 mt-1">
                        {formatDate(appointment.appointmentDate)} ·{" "}
                        {appointment.appointmentTime || "No time"}
                      </p>
                    </div>
                    <span className="text-xs text-surface-500 shrink-0">
                      {appointment.status || "—"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-200/70">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary-500" />
              <h2 className="text-sm font-semibold text-surface-900">
                Prescriptions
              </h2>
            </div>
            <Button
              size="sm"
              onClick={() =>
                navigate("/prescriptions/new", {
                  state: {
                    patientId: patient.patientId,
                    patientName: `${patient.firstName} ${patient.lastName} (#${patient.patientId})`,
                  },
                })
              }
            >
              <Plus className="w-3.5 h-3.5" />
              New Prescription
            </Button>
          </div>
          {relatedLoading ? (
            <div className="py-8">
              <Loader text="Loading prescriptions..." />
            </div>
          ) : prescriptions.length === 0 ? (
            <EmptyState text="No prescriptions found" />
          ) : (
            <div className="divide-y divide-surface-200/70">
              {prescriptions.map((prescription) => (
                <button
                  key={prescription.prescriptionId}
                  type="button"
                  onClick={() =>
                    navigate(`/prescriptions/${prescription.prescriptionId}`)
                  }
                  className="w-full text-left px-5 py-4 hover:bg-primary-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-900">
                          Prescription #{prescription.prescriptionId}
                        </p>
                        <p className="text-xs text-surface-500 mt-1">
                          {formatDate(prescription.issuedDate)} ·{" "}
                          {prescription.itemCount || 0} item
                          {Number(prescription.itemCount || 0) === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-surface-700 shrink-0">
                      Rs. {Number(prescription.medicineTotal || 0).toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

