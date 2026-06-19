import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Trash2,
  Eye,
  Filter,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { toast } from "react-toastify";
import stockInService from "../../api/services/stockInService";
import DataTable from "../../components/common/DataTable";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";

const STATUS_META = {
  Draft: {
    label: "Draft",
    icon: FileText,
    cls: "bg-surface-100 text-surface-600 border-surface-300/50",
  },
  Pending: {
    label: "Pending",
    icon: Clock,
    cls: "bg-amber-50 text-amber-700 border-amber-300/50",
  },
  Received: {
    label: "Received",
    icon: CheckCircle2,
    cls: "bg-emerald-50 text-emerald-700 border-emerald-300/50",
  },
  Cancelled: {
    label: "Cancelled",
    icon: XCircle,
    cls: "bg-red-50 text-red-600 border-red-300/50",
  },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.Draft;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.cls}`}
    >
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

const STATUSES = ["All", "Draft", "Pending", "Received", "Cancelled"];
const LIMIT = 15;

export default function StockInList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stats, setStats] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, order: null });
  const [deleting, setDeleting] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: LIMIT,
        sortBy: "createdAt",
        sortOrder: "DESC",
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "All") params.status = statusFilter;

      const result = await stockInService.getAll(params);
      setOrders(result.data ?? []);
      setTotal(result.total ?? 0);
    } catch {
      toast.error("Failed to load purchase orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchOrders, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchOrders]);

  useEffect(() => {
    stockInService
      .getStats()
      .then(setStats)
      .catch(() => {});
  }, [orders]);

  const handleDelete = async () => {
    if (!deleteModal.order) return;
    setDeleting(true);
    try {
      await stockInService.delete(deleteModal.order.poId);
      setDeleteModal({ open: false, order: null });
      toast.success("Purchase order deleted.");
      fetchOrders();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to delete.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "poId",
      label: "PO #",
      width: "80px",
      render: (row) => (
        <span className="font-mono text-xs text-surface-500">#{row.poId}</span>
      ),
    },
    {
      key: "supplier",
      label: "Supplier",
      render: (row) => (
        <span className="text-sm text-surface-800 font-medium">
          {row.supplier?.name || (row.supplierId ? `Supplier #${row.supplierId}` : "—")}
        </span>
      ),
    },
    {
      key: "items",
      label: "Items",
      render: (row) => (
        <span className="text-sm text-surface-600">
          {row.items?.length ?? 0} line{row.items?.length !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      key: "totalAmount",
      label: "Total",
      render: (row) =>
        row.totalAmount != null ? (
          <span className="text-sm font-medium text-surface-800">
            ₹{Number(row.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        ) : (
          <span className="text-surface-400">—</span>
        ),
    },
    {
      key: "orderDate",
      label: "Order Date",
      render: (row) =>
        row.orderDate
          ? new Date(row.orderDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      width: "90px",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/stock-in/${row.poId}`);
            }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status !== "Received" && row.status !== "Cancelled" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteModal({ open: true, order: row });
              }}
              className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Stock In</h1>
          <p className="text-sm text-surface-500 mt-1">
            Purchase orders, stock receiving &amp; batch tracking
          </p>
        </div>
        <Button onClick={() => navigate("/stock-in/new")}>
          <Plus className="w-4 h-4" />
          New Order
        </Button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Package, color: "text-primary-500" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500" },
            { label: "Received", value: stats.received, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Cancelled", value: stats.cancelled, icon: XCircle, color: "text-red-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-surface-500">{label}</p>
                <p className="text-xl font-bold text-surface-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search by notes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-surface-300/60 text-sm text-surface-700 placeholder-surface-400 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-surface-400 shrink-0" />
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter === s
                  ? "bg-primary-500 text-white border-primary-500"
                  : "bg-white text-surface-600 border-surface-300/60 hover:border-primary-400 hover:text-primary-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Loader text="Loading purchase orders..." />
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          page={page}
          total={total}
          limit={LIMIT}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/stock-in/${row.poId}`)}
        />
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, order: null })}
        title="Delete Purchase Order"
        size="sm"
      >
        <p className="text-sm text-surface-600 mb-6">
          Are you sure you want to delete{" "}
          <strong className="text-surface-900">PO #{deleteModal.order?.poId}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteModal({ open: false, order: null })}>
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
