import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, Plus, Search, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import doctorService from "../../api/services/doctorService";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";

export default function DoctorList() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, doctor: null });
  const [deleting, setDeleting] = useState(false);
  const limit = 15;

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      if (search.trim()) {
        const results = await doctorService.search(search);
        const data = results?.data ?? (Array.isArray(results) ? results : []);
        setDoctors(data);
        setTotal(data.length);
      } else {
        const result = await doctorService.getAll(page, limit);
        setDoctors(result.data || []);
        setTotal(result.total || 0);
      }
    } catch {
      toast.error("Failed to fetch doctors. Please try again.");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const debounce = setTimeout(fetchDoctors, search ? 400 : 0);
    return () => clearTimeout(debounce);
  }, [fetchDoctors, search]);

  const handleDelete = async () => {
    if (!deleteModal.doctor) return;
    setDeleting(true);
    try {
      await doctorService.delete(deleteModal.doctor.doctorId);
      setDeleteModal({ open: false, doctor: null });
      toast.success(
        `Dr. ${deleteModal.doctor.firstName} ${deleteModal.doctor.lastName} has been archived.`,
      );
      fetchDoctors();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to archive doctor.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "doctorId",
      label: "ID",
      width: "70px",
      render: (row) => (
        <span className="text-surface-500 font-mono text-xs">
          #{row.doctorId}
        </span>
      ),
    },
    {
      key: "name",
      label: "Doctor Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-xs font-bold text-primary-600 border border-primary-500/20">
            {row.firstName?.[0]}
            {row.lastName?.[0]}
          </div>
          <div>
            <p className="font-medium text-surface-900">
              Dr. {row.firstName} {row.lastName}
            </p>
            <p className="text-xs text-surface-500">{row.email || "-"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "specialization",
      label: "Specialization",
      render: (row) => row.specialization || "-",
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => row.phone || "-",
    },
    {
      key: "username",
      label: "Login User",
      render: (row) => row.username || "-",
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
              navigate(`/doctors/${row.doctorId}/edit`);
            }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ open: true, doctor: row });
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
          <h1 className="text-2xl font-bold text-surface-900">Doctors</h1>
          <p className="text-sm text-surface-500 mt-1">
            Manage doctor profiles and linked doctor logins
          </p>
        </div>
        <Button onClick={() => navigate("/doctors/new")}>
          <Plus className="w-4 h-4" />
          Add Doctor
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search by name, specialty, email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-surface-300/60 text-sm text-surface-700 placeholder-surface-400 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all"
        />
      </div>

      {loading ? (
        <Loader text="Fetching doctors..." />
      ) : (
        <DataTable
          columns={columns}
          data={doctors}
          page={page}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/doctors/${row.doctorId}`)}
        />
      )}

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, doctor: null })}
        title="Archive Doctor"
        size="sm"
      >
        <p className="text-sm text-surface-600 mb-6">
          Are you sure you want to archive{" "}
          <strong className="text-surface-900">
            Dr. {deleteModal.doctor?.firstName} {deleteModal.doctor?.lastName}
          </strong>
          ? Existing appointment history will be preserved.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ open: false, doctor: null })}
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
