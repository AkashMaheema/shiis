import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Hash,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Stethoscope,
  User,
} from "lucide-react";
import { toast } from "react-toastify";
import doctorService from "../../api/services/doctorService";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";

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
          {value || <span className="text-surface-400 font-normal">-</span>}
        </p>
      </div>
    </div>
  );
}

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    doctorService
      .getById(id)
      .then(setDoctor)
      .catch(() => {
        toast.error("Failed to load doctor details.");
        navigate("/doctors");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <Loader text="Loading doctor details..." />;
  if (!doctor) return null;

  const initials =
    (doctor.firstName?.[0] ?? "") + (doctor.lastName?.[0] ?? "");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/doctors")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Doctors
        </button>

        <Button size="sm" onClick={() => navigate(`/doctors/${id}/edit`)}>
          <Edit3 className="w-3.5 h-3.5" />
          Edit Doctor
        </Button>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-surface-200/60">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center text-2xl font-bold text-primary-600 shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">
              Dr. {doctor.firstName} {doctor.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-surface-500">
              <Stethoscope className="w-4 h-4 text-primary-500" />
              {doctor.specialization || "General Practice"}
            </div>
          </div>
        </div>

        <div>
          <DetailRow
            icon={<Hash className="w-4 h-4 text-primary-500" />}
            label="Doctor ID"
            value={`#${doctor.doctorId}`}
          />
          <DetailRow
            icon={<Stethoscope className="w-4 h-4 text-primary-500" />}
            label="Specialization"
            value={doctor.specialization}
          />
          <DetailRow
            icon={<Phone className="w-4 h-4 text-primary-500" />}
            label="Phone"
            value={doctor.phone}
          />
          <DetailRow
            icon={<Mail className="w-4 h-4 text-primary-500" />}
            label="Email"
            value={doctor.email}
          />
          <DetailRow
            icon={<MapPin className="w-4 h-4 text-primary-500" />}
            label="Address"
            value={doctor.address}
          />
          <DetailRow
            icon={<KeyRound className="w-4 h-4 text-primary-500" />}
            label="Login Username"
            value={doctor.username}
          />
          <DetailRow
            icon={<User className="w-4 h-4 text-primary-500" />}
            label="Role"
            value={doctor.roleName || "doctor"}
          />
        </div>
      </div>
    </div>
  );
}
