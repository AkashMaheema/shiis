import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Trash2, Edit3, Building2 } from "lucide-react";
import { toast } from "react-toastify";
import supplierService from "../../api/services/supplierService";
import DataTable from "../../components/common/DataTable";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";

export default function SupplierList() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    supplier: null,
  });
  const [deleting, setDeleting] = useState(false);
  const limit = 15;

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      if (search.trim()) {
        const results = await supplierService.search(search);
        const data = results?.data ?? (Array.isArray(results) ? results : []);
        setSuppliers(data);
        setTotal(data.length);
      } else {
        const result = await supplierService.getAll(page, limit);
        setSuppliers(result.data || []);
        setTotal(result.total || 0);
      }
    } catch {
      toast.error("Failed to fetch suppliers. Please try again.");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const debounce = setTimeout(fetchSuppliers, search ? 400 : 0);
    return () => clearTimeout(debounce);
  }, [fetchSuppliers, search]);

  const handleDelete = async () => {
    if (!deleteModal.supplier) return;
    setDeleting(true);
    try {
      await supplierService.delete(deleteModal.supplier.supplierId);
      setDeleteModal({ open: false, supplier: null });
      toast.success(`"${deleteModal.supplier.name}" has been archived.`);
      fetchSuppliers();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to delete supplier.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "supplierId",
      label: "ID",
      width: "70px",
      render: (row) => (
        <span className="text-surface-500 font-mono text-xs">
          #{row.supplierId}
        </span>
      ),
    },
    {
      key: "name",
      label: "Supplier Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center text-xs font-bold text-primary-600 border border-primary-500/20 shrink-0">
            {row.name?.[0]?.toUpperCase() ?? <Building2 className="w-4 h-4" />}
          </div>
          <div>
            <p className="font-medium text-surface-900">{row.name}</p>
            <p className="text-xs text-surface-500">
              {row.email || "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "contactPerson",
      label: "Contact Person",
      render: (row) => row.contactPerson || "—",
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => row.phone || "—",
    },
    {
      key: "city",
      label: "City",
      render: (row) => row.city || "—",
    },
    {
      key: "country",
      label: "Country",
      render: (row) => row.country || "—",
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
              navigate(`/suppliers/${row.supplierId}/edit`);
            }}
            className="p-1.5 rounded-lg text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ open: true, supplier: row });
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
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Suppliers</h1>
          <p className="text-sm text-surface-500 mt-1">
            Manage supplier records and purchase contacts
          </p>
        </div>
        <Button onClick={() => navigate("/suppliers/new")}>
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search by name, contact, email..."
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
        <Loader text="Fetching suppliers..." />
      ) : (
        <DataTable
          columns={columns}
          data={suppliers}
          page={page}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/suppliers/${row.supplierId}`)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, supplier: null })}
        title="Archive Supplier"
        size="sm"
      >
        <p className="text-sm text-surface-600 mb-6">
          Are you sure you want to archive{" "}
          <strong className="text-surface-900">
            {deleteModal.supplier?.name}
          </strong>
          ? The record will be preserved and can be restored later.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ open: false, supplier: null })}
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
