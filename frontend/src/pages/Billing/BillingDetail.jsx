import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CreditCard, Edit3, Hash, Receipt, User } from "lucide-react";
import { toast } from "react-toastify";
import billingService from "../../api/services/billingService";
import Button from "../../components/common/Button";
import FormInput from "../../components/common/FormInput";
import FormSelect from "../../components/common/FormSelect";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";

const paymentMethods = [
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "Online", label: "Online" },
  { value: "Insurance", label: "Insurance" },
];

function money(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function statusKey(status) {
  if (status === "Paid") return "completed";
  if (status === "Partially Paid") return "pending";
  if (status === "Voided") return "cancelled";
  return "inactive";
}

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
          {value || <span className="text-surface-400 font-normal">-</span>}
        </p>
      </div>
    </div>
  );
}

export default function BillingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [payment, setPayment] = useState({ paymentMethod: "Cash", amount: "" });
  const [paying, setPaying] = useState(false);

  const fetchBill = () => {
    setLoading(true);
    billingService
      .getById(id)
      .then((data) => {
        setBill(data);
        setPayment((prev) => ({
          ...prev,
          amount: data.balanceAmount ? Number(data.balanceAmount).toFixed(2) : "",
        }));
      })
      .catch(() => {
        toast.error("Failed to load bill details.");
        navigate("/billing");
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchBill, [id, navigate]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaying(true);
    try {
      const updated = await billingService.pay(id, {
        paymentMethod: payment.paymentMethod,
        amount: Number(payment.amount),
      });
      setBill(updated);
      setPaymentModal(false);
      toast.success("Payment recorded successfully.");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to process payment.";
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <Loader text="Loading bill details..." />;
  if (!bill) return null;

  const patientName = bill.patient
    ? `${bill.patient.firstName} ${bill.patient.lastName}`
    : "-";
  const canPay = Number(bill.balanceAmount || 0) > 0 && bill.status !== "Voided";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/billing")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-500 hover:text-surface-900 hover:bg-surface-100 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Billing
        </button>

        <div className="flex gap-2">
          {canPay && (
            <Button size="sm" variant="secondary" onClick={() => setPaymentModal(true)}>
              <CreditCard className="w-3.5 h-3.5" />
              Record Payment
            </Button>
          )}
          <Button size="sm" onClick={() => navigate(`/billing/${id}/edit`)}>
            <Edit3 className="w-3.5 h-3.5" />
            Edit Bill
          </Button>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-surface-200/60">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center text-primary-600 shrink-0">
              <Receipt className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900">
                Bill #{bill.billId}
              </h1>
              <p className="text-sm text-surface-500 mt-1">{patientName}</p>
            </div>
          </div>
          <StatusBadge status={statusKey(bill.status)} label={bill.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div>
            <DetailRow
              icon={<Hash className="w-4 h-4 text-primary-500" />}
              label="Bill ID"
              value={`#${bill.billId}`}
            />
            <DetailRow
              icon={<User className="w-4 h-4 text-primary-500" />}
              label="Patient"
              value={patientName}
            />
            <DetailRow
              icon={<Receipt className="w-4 h-4 text-primary-500" />}
              label="Appointment"
              value={bill.appointmentId ? `#${bill.appointmentId}` : null}
            />
            <DetailRow
              icon={<CreditCard className="w-4 h-4 text-primary-500" />}
              label="Balance"
              value={money(bill.balanceAmount)}
            />
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-surface-200/70 bg-surface-50 p-4">
                <p className="text-xs text-surface-400 font-medium uppercase">
                  Total
                </p>
                <p className="text-lg font-bold text-surface-900 mt-1">
                  {money(bill.totalAmount)}
                </p>
              </div>
              <div className="rounded-lg border border-surface-200/70 bg-surface-50 p-4">
                <p className="text-xs text-surface-400 font-medium uppercase">
                  Paid
                </p>
                <p className="text-lg font-bold text-primary-600 mt-1">
                  {money(bill.paidAmount)}
                </p>
              </div>
              <div className="rounded-lg border border-surface-200/70 bg-surface-50 p-4">
                <p className="text-xs text-surface-400 font-medium uppercase">
                  Balance
                </p>
                <p className="text-lg font-bold text-surface-900 mt-1">
                  {money(bill.balanceAmount)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-surface-200/70">
              <table className="w-full text-sm">
                <thead className="bg-surface-100/70">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">
                      Item
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200/70">
                  {(bill.items || []).map((item) => (
                    <tr key={item.billItemId}>
                      <td className="px-4 py-3 text-surface-800 font-medium">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-right">{item.quantity || 1}</td>
                      <td className="px-4 py-3 text-right">
                        {money(item.unitPrice ?? item.amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {money(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(bill.payments || []).length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-surface-200/70">
                <table className="w-full text-sm">
                  <thead className="bg-surface-100/70">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">
                        Payment
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase">
                        Method
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200/70">
                    {bill.payments.map((p) => (
                      <tr key={p.paymentId}>
                        <td className="px-4 py-3">
                          {p.paymentDate
                            ? new Date(p.paymentDate).toLocaleDateString("en-IN")
                            : "-"}
                        </td>
                        <td className="px-4 py-3">{p.paymentMethod}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {money(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={paymentModal}
        onClose={() => setPaymentModal(false)}
        title="Record Payment"
        size="sm"
      >
        <form onSubmit={handlePayment} className="space-y-4">
          <FormSelect
            label="Payment Method"
            name="paymentMethod"
            value={payment.paymentMethod}
            onChange={(e) =>
              setPayment((prev) => ({ ...prev, paymentMethod: e.target.value }))
            }
            options={paymentMethods}
            required
          />
          <FormInput
            label="Amount"
            name="amount"
            type="number"
            min="0.01"
            max={bill.balanceAmount}
            step="0.01"
            value={payment.amount}
            onChange={(e) =>
              setPayment((prev) => ({ ...prev, amount: e.target.value }))
            }
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={paying}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
