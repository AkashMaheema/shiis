import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Trash2, Edit3, Package } from "lucide-react";
import { toast } from "react-toastify";
import medicineService from "../../api/services/medicineService";
import DataTable from "../../components/common/DataTable";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";

function StockBadge({ quantity }) {
  const qty = quantity ?? 0;
  let colorClasses;

  if (qty === 0) {
    colorClasses =
      "bg-red-500/15 text-red-500 border-red-500/20";
  } else if (qty <= 10) {
    colorClasses =
      "bg-amber-500/15 text-amber-500 border-amber-500/20";
  } else if (qty <= 50) {
    colorClasses =
      "bg-blue-500/15 text-blue-500 border-blue-500/20";
  } else {
    colorClasses =
      "bg-emerald-500/15 text-emerald-500 border-emerald-500/20";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${colorClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {qty}
    </span>
  );
}

export default function MedicineList() {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    medicine: null,
  });
  const [deleting, setDeleting] = useState(false);
  const limit = 15;

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      if (search.trim()) {
        const results = await medicineService.search(search);
        const data = results.data || results;
        setMedicines(Array.isArray(data) ? data : []);
        setTotal(results.total || (Array.isArray(data) ? data.length : 0));
      } else {
        const result = await medicineService.getAll(page, limit);
        setMedicines(result.data || []);
        setTotal(result.total || 0);
      }
    } catch {
      toast.error("Failed to fetch medicines. Please try again.");
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const debounce = setTimeout(fetchMedicines, search ? 400 : 0);
    return () => clearTimeout(debounce);
  }, [fetchMedicines, search]);

  const handleDelete = async () => {
    if (!deleteModal.medicine) return;
    setDeleting(true);
    try {
      await medicineService.delete(deleteModal.medicine.medicineId);
      setDeleteModal({ open: false, medicine: null });
      toast.success(
        `${deleteModal.medicine.name} has been deleted.`,
      );
      fetchMedicines();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to delete medicine.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "medicineId",
      label: "ID",
      width: "70px",
      render: (row) => (
        <span className="text-surface-500 font-mono text-xs">
          #{row.medicineId}
        </span>
      ),
    },
    {
      key: "name",
      label: "Medicine",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-xs font-bold text-emerald-600 border border-emerald-500/20">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium text-surface-900">{row.name}</p>
            <p className="text-xs text-surface-500">
              {row.category || "Uncategorized"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (row) => (
        <span className="text-surface-600">{row.category || "—"}</span>
      ),
    },
    {
      key: "unitPrice",
      label: "Unit Price",
      render: (row) => (
        <span className="font-medium text-surface-700">
          {row.unitPrice != null
            ? `Rs. ${Number(row.unitPrice).toFixed(2)}`
            : "—"}
        </span>
      ),
    },
    {
      key: "stock",
      label: "Stock",
      width: "100px",
      render: (row) => (
        <StockBadge quantity={row.stock?.totalQuantity} />
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
              navigate(`/inventory/${row.medicineId}/edit`);
            }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ open: true, medicine: row });
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
            Medicine & Inventory
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Manage medicines, stock levels, and inventory
          </p>
        </div>
        <Button onClick={() => navigate("/inventory/new")}>
          <Plus className="w-4 h-4" />
          Add Medicine
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search by name or category..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-surface-300/60 text-sm text-surface-700 placeholder-surface-400 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all"
        />
      </div>

      {/* Table */}
      {loading ? (
        <Loader text="Fetching medicines..." />
      ) : (
        <DataTable
          columns={columns}
          data={medicines}
          page={page}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/inventory/${row.medicineId}`)}
          emptyMessage="No medicines found"
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, medicine: null })}
        title="Delete Medicine"
        size="sm"
      >
        <p className="text-sm text-surface-600 mb-6">
          Are you sure you want to delete{" "}
          <strong className="text-surface-900">
            {deleteModal.medicine?.name}
          </strong>
          ? This will also remove all associated stock records, batches, and
          inventory logs. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ open: false, medicine: null })}
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
