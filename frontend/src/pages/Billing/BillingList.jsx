import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, Plus, Search, Trash2, Receipt } from "lucide-react";
import { toast } from "react-toastify";
import billingService from "../../api/services/billingService";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Unpaid", label: "Unpaid" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Paid", label: "Paid" },
];

function statusKey(status) {
  if (status === "Paid") return "completed";
  if (status === "Partially Paid") return "pending";
  if (status === "Voided") return "cancelled";
  return "inactive";
}

function money(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

export default function BillingList() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, bill: null });
  const [deleting, setDeleting] = useState(false);
  const limit = 15;

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (search.trim()) filters.search = search.trim();
      if (statusFilter) filters.status = statusFilter;
      const result = await billingService.getAll(page, limit, filters);
      setBills(result.data || []);
      setTotal(result.total || 0);
    } catch {
      toast.error("Failed to fetch bills. Please try again.");
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchBills, search ? 400 : 0);
    return () => clearTimeout(debounce);
  }, [fetchBills, search]);

  const handleDelete = async () => {
    if (!deleteModal.bill) return;
    setDeleting(true);
    try {
      await billingService.delete(deleteModal.bill.billId);
      setDeleteModal({ open: false, bill: null });
      toast.success(`Bill #${deleteModal.bill.billId} has been voided.`);
      fetchBills();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to void bill.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "billId",
      label: "ID",
      width: "70px",
      render: (row) => (
        <span className="text-surface-500 font-mono text-xs">#{row.billId}</span>
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
    {
      key: "createdDate",
      label: "Bill Date",
      render: (row) =>
        row.createdDate
          ? new Date(row.createdDate).toLocaleDateString("en-IN")
          : "-",
    },
    {
      key: "totalAmount",
      label: "Total",
      render: (row) => <span className="font-medium">{money(row.totalAmount)}</span>,
    },
    {
      key: "paidAmount",
      label: "Paid",
      render: (row) => money(row.paidAmount),
    },
    {
      key: "status",
      label: "Status",
      width: "150px",
      render: (row) => (
        <StatusBadge status={statusKey(row.status)} label={row.status || "Unpaid"} />
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
              navigate(`/billing/${row.billId}/edit`);
            }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ open: true, bill: row });
            }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Void"
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
          <h1 className="text-2xl font-bold text-surface-900">Billing</h1>
          <p className="text-sm text-surface-500 mt-1">
            Create bills, track balances and process patient payments
          </p>
        </div>
        <Button onClick={() => navigate("/billing/new")}>
          <Plus className="w-4 h-4" />
          New Bill
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search by bill, patient or phone..."
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

      {loading ? (
        <Loader text="Fetching bills..." />
      ) : (
        <DataTable
          columns={columns}
          data={bills}
          page={page}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/billing/${row.billId}`)}
          emptyMessage="No bills found"
        />
      )}

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, bill: null })}
        title="Void Bill"
        size="sm"
      >
        <p className="text-sm text-surface-600 mb-6">
          Are you sure you want to void{" "}
          <strong className="text-surface-900">
            bill #{deleteModal.bill?.billId}
          </strong>
          ? It will be hidden from the active billing list.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ open: false, bill: null })}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            Void Bill
          </Button>
        </div>
      </Modal>
    </div>
  );
}
