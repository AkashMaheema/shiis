import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Edit3, FileText, Hash, Pill, User } from "lucide-react";
import { toast } from "react-toastify";
import prescriptionService from "../../api/services/prescriptionService";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import { useAuth } from "../../contexts/useAuth";

function money(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function formatDoctorName(doctor) {
  if (!doctor) return "-";
  const first = String(doctor.firstName || "").replace(/^dr\.?\s*/i, "").trim();
  return `Dr. ${`${first} ${doctor.lastName || ""}`.trim()}`;
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
          {value || <span className="text-surface-400 font-normal">-</span>}
        </p>
      </div>
    </div>
  );
}

export default function PrescriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleName = user?.roleName?.toLowerCase();
  const isAdmin = roleName === "admin";
  const isDoctor = roleName === "doctor";
  const currentDoctorId =
    user?.doctorId ?? (isDoctor && user?.username === "doctor" ? 1 : null);
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prescriptionService
      .getById(id)
      .then((rx) => {
        if (
          isDoctor &&
          !isAdmin &&
          currentDoctorId &&
          Number(rx.doctor?.doctorId) !== Number(currentDoctorId)
        ) {
          toast.error("You can only view your own prescriptions.");
          navigate("/prescriptions");
          return;
        }
        setPrescription(rx);
      })
      .catch(() => {
        toast.error("Failed to load prescription details.");
        navigate("/prescriptions");
      })
      .finally(() => setLoading(false));
  }, [id, navigate, isDoctor, isAdmin, currentDoctorId]);

  if (loading) return <Loader text="Loading prescription details..." />;
  if (!prescription) return null;

  const patientName = prescription.patient
    ? `${prescription.patient.firstName} ${prescription.patient.lastName}`
    : "-";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/prescriptions")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Prescriptions
        </button>
        <Button size="sm" onClick={() => navigate(`/prescriptions/${id}/edit`)}>
          <Edit3 className="w-3.5 h-3.5" />
          Edit Prescription
        </Button>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-surface-200/60">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center text-primary-600 shrink-0">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">
              Prescription #{prescription.prescriptionId}
            </h1>
            <p className="text-sm text-surface-500 mt-1">{patientName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div>
            <DetailRow
              icon={<Hash className="w-4 h-4 text-primary-500" />}
              label="Prescription ID"
              value={`#${prescription.prescriptionId}`}
            />
            <DetailRow
              icon={<User className="w-4 h-4 text-primary-500" />}
              label="Patient"
              value={patientName}
            />
            <DetailRow
              icon={<User className="w-4 h-4 text-primary-500" />}
              label="Doctor"
              value={formatDoctorName(prescription.doctor)}
            />
            <DetailRow
              icon={<Calendar className="w-4 h-4 text-primary-500" />}
              label="Issued"
              value={
                prescription.issuedDate
                  ? new Date(prescription.issuedDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : null
              }
            />
            <DetailRow
              icon={<Pill className="w-4 h-4 text-primary-500" />}
              label="Billable Total"
              value={money(prescription.medicineTotal)}
            />
          </div>

          <div className="space-y-5">
            {prescription.notes && (
              <div className="rounded-lg border border-surface-200/70 bg-surface-50 p-4">
                <p className="text-xs text-surface-400 font-medium uppercase">
                  Notes
                </p>
                <p className="text-sm text-surface-700 mt-1">
                  {prescription.notes}
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-surface-200/70">
              <table className="w-full text-sm">
                <thead className="bg-surface-100/70">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">
                      Medicine
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">
                      Dosage
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/70">
                  {(prescription.items || []).map((item) => {
                    const amount =
                      Number(item.quantity || 0) *
                      Number(item.medicine?.unitPrice || 0);
                    return (
                      <tr key={item.itemId}>
                        <td className="px-4 py-3 text-surface-800 font-medium">
                          {item.medicine?.name || `Medicine #${item.medicineId}`}
                        </td>
                        <td className="px-4 py-3 text-surface-600">
                          {item.dosage || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.quantity || 1}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {money(amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
