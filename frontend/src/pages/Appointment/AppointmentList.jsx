import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Trash2, Edit3, CalendarCheck } from "lucide-react";
import { toast } from "react-toastify";
import appointmentService from "../../api/services/appointmentService";
import labService from "../../api/services/labService";
import DataTable from "../../components/common/DataTable";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "No Show", label: "No Show" },
];

const formatDoctorName = (firstName, lastName) => {
  const cleanFirst = String(firstName || "").replace(/^dr\.?\s*/i, "").trim();
  const cleanLast = String(lastName || "").trim();
  return `Dr. ${`${cleanFirst} ${cleanLast}`.trim()}`;
};

export default function AppointmentList() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [doctorMap, setDoctorMap] = useState({});
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    appointment: null,
  });
  const [deleting, setDeleting] = useState(false);
  const limit = 15;

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (statusFilter) filters.status = statusFilter;

      const result = await appointmentService.getAll(page, limit, filters);
      setAppointments(result.data || []);
      setTotal(result.total || 0);
    } catch {
      toast.error("Failed to fetch appointments. Please try again.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchAppointments, search ? 400 : 0);
    return () => clearTimeout(debounce);
  }, [fetchAppointments, search]);

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

  const handleDelete = async () => {
    if (!deleteModal.appointment) return;
    setDeleting(true);
    try {
      await appointmentService.delete(deleteModal.appointment.appointmentId);
      setDeleteModal({ open: false, appointment: null });
      toast.success("Appointment has been archived.");
      fetchAppointments();
    } catch (err) {
      const msg =
        err.response?.data?.message || "Failed to delete appointment.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "appointmentId",
      label: "ID",
      width: "70px",
      render: (row) => (
        <span className="text-surface-500 font-mono text-xs">
          #{row.appointmentId}
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
      key: "doctorId",
      label: "Doctor",
      render: (row) => (
        <span className="text-surface-700 font-medium">
          {row.doctorId ? doctorMap[row.doctorId] || `Doctor #${row.doctorId}` : "—"}
        </span>
      ),
    },
    {
      key: "appointmentDate",
      label: "Date & Time",
      render: (row) => {
        const date = row.appointmentDate
          ? new Date(row.appointmentDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—";
        return (
          <div>
            <p className="text-surface-800 font-medium text-sm">{date}</p>
            <p className="text-xs text-surface-500">
              {row.appointmentTime || "—"}
            </p>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      width: "130px",
      render: (row) => {
        const statusMap = {
          Scheduled: "booked",
          Booked: "booked",
          Completed: "completed",
          Cancelled: "cancelled",
          "No Show": "inactive",
        };
        return (
          <StatusBadge
            status={statusMap[row.status] || "active"}
            label={row.status}
          />
        );
      },
    },
    {
      key: "reason",
      label: "Reason",
      render: (row) => (
        <span className="text-surface-600 text-sm truncate max-w-[180px] block">
          {row.reason || "—"}
        </span>
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
              navigate(`/appointments/${row.appointmentId}/edit`);
            }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ open: true, appointment: row });
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
          <h1 className="text-2xl font-bold text-surface-900">Appointments</h1>
          <p className="text-sm text-surface-500 mt-1">
            Schedule, track and manage patient appointments
          </p>
        </div>
        <Button onClick={() => navigate("/appointments/new")}>
          <Plus className="w-4 h-4" />
          New Appointment
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search by patient or reason..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-surface-300/60 text-sm text-surface-700 placeholder-surface-400 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all"
          />
        </div>

        {/* Status Filter */}
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
        <Loader text="Fetching appointments..." />
      ) : (
        <DataTable
          columns={columns}
          data={appointments}
          page={page}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) =>
            navigate(`/appointments/${row.appointmentId}`)
          }
          emptyMessage="No appointments found"
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, appointment: null })}
        title="Archive Appointment"
        size="sm"
      >
        <p className="text-sm text-surface-600 mb-6">
          Are you sure you want to archive this appointment
          {deleteModal.appointment?.patient && (
            <>
              {" "}
              for{" "}
              <strong className="text-surface-900">
                {deleteModal.appointment.patient.firstName}{" "}
                {deleteModal.appointment.patient.lastName}
              </strong>
            </>
          )}
          ? The record will be preserved and can be restored later.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              setDeleteModal({ open: false, appointment: null })
            }
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
