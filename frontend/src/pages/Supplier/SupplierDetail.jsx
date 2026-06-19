import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Phone,
  Mail,
  MapPin,
  Hash,
  Building2,
  User,
  Globe,
  Calendar,
} from "lucide-react";
import supplierService from "../../api/services/supplierService";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
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

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplierService
      .getById(id)
      .then(setSupplier)
      .catch(() => {
        toast.error("Failed to load supplier details.");
        navigate("/suppliers");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <Loader text="Loading supplier details..." />;
  if (!supplier) return null;

  const initial = supplier.name?.[0]?.toUpperCase() ?? "S";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/suppliers")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Suppliers
        </button>

        <Button size="sm" onClick={() => navigate(`/suppliers/${id}/edit`)}>
          <Edit3 className="w-3.5 h-3.5" />
          Edit Supplier
        </Button>
      </div>

      {/* ── Profile card ── */}
      <div className="glass-card p-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-surface-200/60">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center text-2xl font-bold text-primary-600 shrink-0">
            {initial}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">
              {supplier.name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {supplier.city && (
                <span className="flex items-center gap-1 text-sm text-surface-500">
                  <MapPin className="w-3.5 h-3.5" />
                  {supplier.city}
                  {supplier.country ? `, ${supplier.country}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <div>
          <DetailRow
            icon={<Hash className="w-4 h-4 text-primary-500" />}
            label="Supplier ID"
            value={`#${supplier.supplierId}`}
          />
          <DetailRow
            icon={<User className="w-4 h-4 text-primary-500" />}
            label="Contact Person"
            value={supplier.contactPerson}
          />
          <DetailRow
            icon={<Phone className="w-4 h-4 text-primary-500" />}
            label="Phone"
            value={supplier.phone}
          />
          <DetailRow
            icon={<Mail className="w-4 h-4 text-primary-500" />}
            label="Email"
            value={supplier.email}
          />
          <DetailRow
            icon={<MapPin className="w-4 h-4 text-primary-500" />}
            label="Address"
            value={supplier.address}
          />
          <DetailRow
            icon={<Building2 className="w-4 h-4 text-primary-500" />}
            label="City"
            value={supplier.city}
          />
          <DetailRow
            icon={<Globe className="w-4 h-4 text-primary-500" />}
            label="Country"
            value={supplier.country}
          />
          <DetailRow
            icon={<Calendar className="w-4 h-4 text-primary-500" />}
            label="Added On"
            value={
              supplier.createdAt
                ? new Date(supplier.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}
