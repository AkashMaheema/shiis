import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  Edit3,
  Trash2,
  FlaskConical,
  Save,
} from "lucide-react";
import { toast } from "react-toastify";
import labService from "../../api/services/labService";
import DataTable from "../../components/common/DataTable";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import FormInput from "../../components/common/FormInput";

const emptyForm = { testName: "", price: "" };

export default function LabTestCatalog() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState({ open: false, test: null });
  const [deleting, setDeleting] = useState(false);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await labService.getTests(search.trim() || undefined);
      setTests(data || []);
    } catch {
      toast.error("Failed to load tests.");
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchTests, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchTests, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (test) => {
    setEditing(test);
    setForm({
      testName: test.testName || "",
      price: test.price ?? "",
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.testName.trim()) errs.testName = "Test name is required";
    if (form.price !== "" && Number.isNaN(Number(form.price)))
      errs.price = "Price must be a number";
    if (form.price !== "" && Number(form.price) < 0)
      errs.price = "Price cannot be negative";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        testName: form.testName.trim(),
        ...(form.price !== "" ? { price: Number(form.price) } : {}),
      };
      if (editing) {
        await labService.updateTest(editing.testId, payload);
        toast.success("Test updated.");
      } else {
        await labService.createTest(payload);
        toast.success("Test created.");
      }
      setModalOpen(false);
      fetchTests();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save test.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.test) return;
    setDeleting(true);
    try {
      await labService.deleteTest(deleteModal.test.testId);
      toast.success("Test deleted.");
      setDeleteModal({ open: false, test: null });
      fetchTests();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to delete test.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "testId",
      label: "ID",
      width: "80px",
      render: (row) => (
        <span className="text-surface-500 font-mono text-xs">
          #{row.testId}
        </span>
      ),
    },
    {
      key: "testName",
      label: "Test Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-accent-500" />
          <span className="text-surface-800 font-medium">{row.testName}</span>
        </div>
      ),
    },
    {
      key: "price",
      label: "Price",
      width: "160px",
      render: (row) =>
        row.price != null ? (
          <span className="text-surface-800 font-medium">
            Rs. {Number(row.price).toFixed(2)}
          </span>
        ) : (
          <span className="text-surface-400">—</span>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "120px",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded-lg text-surface-400 hover:text-accent-400 hover:bg-accent-500/10 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteModal({ open: true, test: row })}
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
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/lab")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lab
        </button>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          New Test
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-surface-900">
          Lab Test Catalog
        </h1>
        <p className="text-sm text-surface-500 mt-1">
          Maintain the list of lab tests available in the hospital
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search tests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-surface-300/60 text-sm text-surface-700 placeholder-surface-400 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 transition-all"
        />
      </div>

      {loading ? (
        <Loader text="Fetching tests..." />
      ) : (
        <DataTable
          columns={columns}
          data={tests}
          page={1}
          total={tests.length}
          limit={tests.length || 1}
          emptyMessage="No tests found. Click 'New Test' to add one."
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Lab Test" : "New Lab Test"}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <FormInput
            label="Test Name"
            name="testName"
            value={form.testName}
            onChange={handleChange}
            error={errors.testName}
            required
            placeholder="e.g. Complete Blood Count"
            maxLength={100}
          />
          <FormInput
            label="Price (Rs.)"
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={handleChange}
            error={errors.price}
            placeholder="0.00"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Save className="w-4 h-4" />
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, test: null })}
        title="Delete Lab Test"
        size="sm"
      >
        <p className="text-sm text-surface-600 mb-6">
          Are you sure you want to delete{" "}
          <strong className="text-surface-900">
            {deleteModal.test?.testName}
          </strong>
          ? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteModal({ open: false, test: null })}
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
