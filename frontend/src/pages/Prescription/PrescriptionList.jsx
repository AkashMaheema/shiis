import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, FileText, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import prescriptionService from "../../api/services/prescriptionService";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import { useAuth } from "../../contexts/useAuth";

function money(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function formatDoctorName(doctor) {
  if (!doctor) return "-";
  const first = String(doctor.firstName || "").replace(/^dr\.?\s*/i, "").trim();
  return `Dr. ${`${first} ${doctor.lastName || ""}`.trim()}`;
}

export default function PrescriptionList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleName = user?.roleName?.toLowerCase();
  const isAdmin = roleName === "admin";
  const isDoctor = roleName === "doctor";
  const currentDoctorId =
    user?.doctorId ?? (isDoctor && user?.username === "doctor" ? 1 : null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    prescription: null,
  });
  const [deleting, setDeleting] = useState(false);
  const limit = 15;

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (isDoctor && !isAdmin) filters.doctorId = currentDoctorId ?? -1;
      const result = await prescriptionService.getAll(page, limit, filters);
      setPrescriptions(result.data || []);
      setTotal(result.total || 0);
    } catch {
      toast.error("Failed to fetch prescriptions. Please try again.");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, isDoctor, isAdmin, currentDoctorId]);

  useEffect(() => {
    const debounce = setTimeout(fetchPrescriptions, search ? 400 : 0);
    return () => clearTimeout(debounce);
  }, [fetchPrescriptions, search]);

  const handleDelete = async () => {
    if (!deleteModal.prescription) return;
    setDeleting(true);
    try {
      await prescriptionService.delete(deleteModal.prescription.prescriptionId);
      setDeleteModal({ open: false, prescription: null });
      toast.success("Prescription has been archived.");
      fetchPrescriptions();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to archive prescription.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "prescriptionId",
      label: "ID",
      width: "90px",
      render: (row) => (
        <span className="text-surface-500 font-mono text-xs">
          #{row.prescriptionId}
        </span>
      ),
    },
    {
      key: "patient",
      label: "Patient",
      render: (row) => {
        const p = row.patient;
        if (!p) return <span className="text-surface-400">-</span>;
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-xs font-bold text-primary-600 border border-primary-500/20">
              {p.firstName?.[0]}
              {p.lastName?.[0]}
            </div>
            <div>
              <p className="font-medium text-surface-900">
                {p.firstName} {p.lastName}
              </p>
              <p className="text-xs text-surface-500">{p.phone || "-"}</p>
            </div>
          </div>
        );
      },
    },
    ...(isAdmin
      ? [
          {
            key: "doctor",
            label: "Doctor",
            render: (row) => (
              <span className="text-surface-700 font-medium">
                {formatDoctorName(row.doctor)}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "issuedDate",
      label: "Issued",
      render: (row) =>
        row.issuedDate
          ? new Date(row.issuedDate).toLocaleDateString("en-IN")
          : "-",
    },
    {
      key: "itemCount",
      label: "Items",
      render: (row) => (
        <span className="text-surface-700">{row.itemCount || 0}</span>
      ),
    },
    {
      key: "medicineTotal",
      label: "Billable",
      render: (row) => (
        <span className="font-medium">{money(row.medicineTotal)}</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/prescriptions/${row.prescriptionId}/edit`);
            }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ open: true, prescription: row });
            }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Archive"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            Prescriptions
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Manage medication orders and sync prescription charges to billing
          </p>
        </div>
        <Button onClick={() => navigate("/prescriptions/new")}>
          <Plus className="w-4 h-4" />
          New Prescription
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search by prescription, medicine or notes..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-surface-300/60 text-sm text-surface-700 placeholder-surface-400 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all"
        />
      </div>

      {loading ? (
        <Loader text="Fetching prescriptions..." />
      ) : (
        <DataTable
          columns={columns}
          data={prescriptions}
          page={page}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/prescriptions/${row.prescriptionId}`)}
          emptyMessage="No prescriptions found"
        />
      )}

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, prescription: null })}
        title="Archive Prescription"
        size="sm"
      >
        <div className="flex items-start gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <p className="text-sm text-surface-600">
            Are you sure you want to archive prescription{" "}
            <strong className="text-surface-900">
              #{deleteModal.prescription?.prescriptionId}
            </strong>
            ? Existing billing medicine lines for the appointment will be
            recalculated.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ open: false, prescription: null })}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Archive
          </Button>
        </div>
      </Modal>
    </div>
  );
}
