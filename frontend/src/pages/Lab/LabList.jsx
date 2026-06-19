import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  FlaskConical,
  Beaker,
} from "lucide-react";
import { toast } from "react-toastify";
import labService from "../../api/services/labService";
import DataTable from "../../components/common/DataTable";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Pending", label: "Pending" },
  { value: "Completed", label: "Completed" },
];

const formatDoctorName = (firstName, lastName) => {
  const cleanFirst = String(firstName || "").replace(/^dr\.?\s*/i, "").trim();
  const cleanLast = String(lastName || "").trim();
  return `Dr. ${`${cleanFirst} ${cleanLast}`.trim()}`;
};

export default function LabList() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, request: null });
  const [deleting, setDeleting] = useState(false);
  const limit = 15;

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (statusFilter) filters.status = statusFilter;

      const result = await labService.getRequests(page, limit, filters);
      setRequests(result.data || []);
      setTotal(result.total || 0);
    } catch {
      toast.error("Failed to fetch lab requests. Please try again.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchRequests, search ? 400 : 0);
    return () => clearTimeout(debounce);
  }, [fetchRequests, search]);

  const handleDelete = async () => {
    if (!deleteModal.request) return;
    setDeleting(true);
    try {
      await labService.deleteRequest(deleteModal.request.requestId);
      setDeleteModal({ open: false, request: null });
      toast.success("Lab request has been deleted.");
      fetchRequests();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to delete lab request.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "requestId",
      label: "ID",
      width: "70px",
      render: (row) => (
        <span className="text-surface-500 font-mono text-xs">
          #{row.requestId}
        </span>
      ),
    },
    {
      key: "patient",
      label: "Patient",
      render: (row) => {
        const p = row.patient;
        if (!p) return <span className="text-surface-400">—</span>;
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
              <p className="text-xs text-surface-500">{p.phone || "—"}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "test",
      label: "Test",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Beaker className="w-3.5 h-3.5 text-accent-500" />
          <div>
            <p className="text-surface-800 font-medium text-sm">
              {row.test?.testName || "—"}
            </p>
            <p className="text-xs text-surface-500">
              {row.test?.price != null
                ? `Rs. ${Number(row.test.price).toFixed(2)}`
                : "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "doctor",
      label: "Doctor",
      render: (row) =>
        row.doctor ? (
          <span className="text-surface-700 font-medium">
            {formatDoctorName(row.doctor.firstName, row.doctor.lastName)}
          </span>
        ) : (
          <span className="text-surface-400">—</span>
        ),
    },
    {
      key: "requestDate",
      label: "Requested",
      render: (row) => {
        const d = row.requestDate
          ? new Date(row.requestDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—";
        return <span className="text-surface-700 text-sm">{d}</span>;
      },
    },
    {
      key: "status",
      label: "Status",
      width: "130px",
      render: (row) => {
        const completed = Boolean(row.result);
        return (
          <StatusBadge
            status={completed ? "completed" : "pending"}
            label={completed ? "Completed" : "Pending"}
          />
        );
      },
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
              navigate(`/lab/${row.requestId}/edit`);
            }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ open: true, request: row });
            }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            Lab Management
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Manage lab test requests, track samples and record results
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate("/lab/tests")}
          >
            <FlaskConical className="w-4 h-4" />
            Test Catalog
          </Button>
          <Button onClick={() => navigate("/lab/new")}>
            <Plus className="w-4 h-4" />
            New Lab Request
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search by test name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-surface-300/60 text-sm text-surface-700 placeholder-surface-400 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3.5 py-2.5 rounded-lg bg-white border border-surface-300/60 text-sm text-surface-700 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all cursor-pointer"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <Loader text="Fetching lab requests..." />
      ) : (
        <DataTable
          columns={columns}
          data={requests}
          page={page}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/lab/${row.requestId}`)}
          emptyMessage="No lab requests found"
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, request: null })}
        title="Delete Lab Request"
        size="sm"
      >
        <p className="text-sm text-surface-600 mb-6">
          Are you sure you want to delete lab request{" "}
          <strong className="text-surface-900">
            #{deleteModal.request?.requestId}
          </strong>
          ? The result (if any) will also be removed. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ open: false, request: null })}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
