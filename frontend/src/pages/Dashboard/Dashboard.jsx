import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Filter,
  FlaskConical,
  PackageCheck,
  Pill,
  Receipt,
  RefreshCw,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import patientService from "../../api/services/patientService";
import appointmentService from "../../api/services/appointmentService";
import medicineService from "../../api/services/medicineService";
import supplierService from "../../api/services/supplierService";
import labService from "../../api/services/labService";
import billingService from "../../api/services/billingService";
import prescriptionService from "../../api/services/prescriptionService";
import stockInService from "../../api/services/stockInService";
import { useAuth } from "../../contexts/useAuth";

const STATUS_COLORS = {
  Scheduled: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-red-100 text-red-700",
  "No-Show": "bg-amber-100 text-amber-700",
};

const ROLE_COPY = {
  admin: {
    title: "Executive BI Dashboard",
    subtitle: "A live operating view across care, laboratory, billing, and inventory.",
  },
  doctor: {
    title: "Doctor BI Dashboard",
    subtitle: "Focused patient care, prescriptions, and upcoming appointment workload.",
  },
  lab: {
    title: "Lab BI Dashboard",
    subtitle: "Track lab demand, pending work, and daily test throughput.",
  },
  user: {
    title: "Operations BI Dashboard",
    subtitle: "Monitor core activity, stock pressure, and daily service load.",
  },
};

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const APPOINTMENT_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "No-Show", label: "No-Show" },
];

const FOCUS_OPTIONS = [
  { value: "auto", label: "Auto focus" },
  { value: "inventory", label: "Inventory" },
  { value: "lab", label: "Lab" },
  { value: "billing", label: "Billing" },
];

const DEFAULT_FILTERS = {
  period: "30",
  appointmentStatus: "",
  focus: "auto",
};

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return `Rs. ${num(value).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function percent(value, total) {
  const totalNum = num(total);
  if (!totalNum) return 0;
  return Math.round((num(value) / totalNum) * 100);
}

function dateValue(date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange(period) {
  if (period === "all") return {};

  const today = new Date();
  const start = new Date(today);

  if (period === "today") {
    return {
      dateFrom: dateValue(start),
      dateTo: dateValue(today),
    };
  }

  start.setDate(today.getDate() - (Number(period) - 1));
  return {
    dateFrom: dateValue(start),
    dateTo: dateValue(today),
  };
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-surface-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-[150px] rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-800 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard({ stat, loading }) {
  const Icon = stat.icon;
  return (
    <div className="glass-card p-5 flex items-start gap-4 min-h-[112px]">
      <div
        className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}
      >
        <Icon className={`w-5 h-5 ${stat.text}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-surface-500 truncate">{stat.label}</p>
        <p className="text-xl font-bold text-surface-900 mt-0.5">
          {loading ? "..." : stat.value}
        </p>
        {stat.change && (
          <p className="text-xs text-surface-400 mt-0.5">{stat.change}</p>
        )}
      </div>
    </div>
  );
}

function BarChart({ title, subtitle, data }) {
  const max = Math.max(...data.map((item) => num(item.value)), 1);

  return (
    <div className="glass-card p-6">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-surface-900">{title}</h3>
        {subtitle && <p className="text-xs text-surface-500 mt-1">{subtitle}</p>}
      </div>
      <div className="space-y-4">
        {data.map((item) => {
          const width = `${Math.max((num(item.value) / max) * 100, 4)}%`;
          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-surface-700">
                  {item.label}
                </span>
                <span className="text-sm font-semibold text-surface-900">
                  {item.displayValue ?? item.value}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DonutChart({ title, subtitle, data }) {
  const total = data.reduce((sum, item) => sum + num(item.value), 0);
  let offset = 25;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="glass-card p-6">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-surface-900">{title}</h3>
        {subtitle && <p className="text-xs text-surface-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-40 h-40 shrink-0">
          <svg viewBox="0 0 100 100" className="w-40 h-40 -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="rgb(241 245 249)"
              strokeWidth="12"
            />
            {data.map((item) => {
              const length = total ? (num(item.value) / total) * circumference : 0;
              const strokeDasharray = `${length} ${circumference - length}`;
              const strokeDashoffset = offset;
              offset -= length;
              return (
                <circle
                  key={item.label}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={item.stroke}
                  strokeWidth="12"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-surface-900">
              {total}
            </span>
            <span className="text-xs text-surface-500">Total</span>
          </div>
        </div>
        <div className="w-full space-y-3">
          {data.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.stroke }}
                />
                <span className="text-sm text-surface-600 truncate">
                  {item.label}
                </span>
              </div>
              <span className="text-sm font-semibold text-surface-900">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightPanel({ items, loading }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-4 h-4 text-primary-600" />
        <h3 className="text-base font-semibold text-surface-900">
          Management Summary
        </h3>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
          Loading...
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-lg border border-surface-100 bg-surface-50/60 p-3"
              >
                <div
                  className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${item.text}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-surface-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniMetricStrip({ items, loading }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="glass-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-surface-500">{item.label}</p>
                <p className="text-2xl font-bold text-surface-900 mt-1">
                  {loading ? "..." : item.value}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}
              >
                <Icon className={`w-5 h-5 ${item.text}`} />
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-surface-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${item.bar}`}
                style={{ width: `${Math.min(Math.max(item.percent, 4), 100)}%` }}
              />
            </div>
            <p className="text-xs text-surface-500 mt-2">{item.note}</p>
          </div>
        );
      })}
    </div>
  );
}

function ProgressPanel({ title, rows, loading }) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-semibold text-surface-900 mb-5">{title}</h3>
      {loading ? (
        <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
          Loading...
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm font-medium text-surface-700">
                  {row.label}
                </span>
                <span className="text-sm font-semibold text-surface-900">
                  {row.value}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-surface-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.color}`}
                  style={{ width: `${Math.min(Math.max(row.percent, 4), 100)}%` }}
                />
              </div>
              {row.note && (
                <p className="text-xs text-surface-500 mt-1.5">{row.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentAppointments({ appointments, loading, statusLabel }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold text-surface-900">
          Recent Appointments
        </h3>
        <span className="text-xs px-2 py-1 rounded-full bg-surface-100 text-surface-600">
          {statusLabel}
        </span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
          Loading...
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
          No appointments found
        </div>
      ) : (
        <ul className="divide-y divide-surface-200">
          {appointments.map((appt) => (
            <li
              key={appt.appointmentId}
              className="py-2.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-surface-900 truncate">
                  {appt.patientFirstName || appt.patientLastName
                    ? `${appt.patientFirstName ?? ""} ${appt.patientLastName ?? ""}`.trim()
                    : `Patient #${appt.patientId}`}
                </p>
                <p className="text-xs text-surface-500 mt-0.5">
                  {appt.appointmentDate
                    ? new Date(appt.appointmentDate).toLocaleDateString()
                    : "-"}
                  {appt.appointmentTime ? ` - ${appt.appointmentTime}` : ""}
                  {appt.reason ? ` - ${appt.reason}` : ""}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  STATUS_COLORS[appt.status] ?? "bg-surface-100 text-surface-600"
                }`}
              >
                {appt.status ?? "-"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListPanel({ title, items, loading, emptyText, renderItem }) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-semibold text-surface-900 mb-4">{title}</h3>
      {loading ? (
        <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
          {emptyText}
        </div>
      ) : (
        <ul className="divide-y divide-surface-200">{items.map(renderItem)}</ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.roleName?.toLowerCase() || "user";
  const isAdmin = role === "admin";
  const isDoctor = role === "doctor";
  const isLab = role === "lab";
  const [allStats, setAllStats] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [lowStockMedicines, setLowStockMedicines] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);

  const roleCopy = ROLE_COPY[role] ?? ROLE_COPY.user;
  const dateRange = useMemo(() => getDateRange(filters.period), [filters.period]);
  const selectedPeriod =
    PERIOD_OPTIONS.find((option) => option.value === filters.period)?.label ??
    "Selected period";
  const selectedStatus =
    APPOINTMENT_STATUS_OPTIONS.find(
      (option) => option.value === filters.appointmentStatus,
    )?.label ?? "All statuses";

  useEffect(() => {
    let isMounted = true;
    const doctorFilter =
      isDoctor && user?.doctorId ? { doctorId: user.doctorId } : {};
    const appointmentFilters = {
      ...doctorFilter,
      ...dateRange,
      ...(filters.appointmentStatus
        ? { status: filters.appointmentStatus }
        : {}),
    };

    setLoading(true);
    Promise.allSettled([
      patientService.getStats(),
      appointmentService.getStats(),
      medicineService.getStats(),
      supplierService.getStats(),
      labService.getStats(),
      billingService.getStats(),
      prescriptionService.getStats(),
      stockInService.getStats(),
      appointmentService.getAll(1, 6, appointmentFilters),
      medicineService.getAll(1, 8, { lowStockOnly: true }),
      billingService.getAll(1, 5),
      prescriptionService.getAll(1, 5, doctorFilter),
    ]).then(
      ([
        patientRes,
        apptRes,
        medRes,
        supplierRes,
        labRes,
        billingRes,
        rxRes,
        stockInRes,
        recentApptRes,
        lowStockRes,
        billListRes,
        rxListRes,
      ]) => {
        if (!isMounted) return;

        setAllStats({
          patient: patientRes.status === "fulfilled" ? patientRes.value : null,
          appt: apptRes.status === "fulfilled" ? apptRes.value : null,
          med: medRes.status === "fulfilled" ? medRes.value : null,
          supplier: supplierRes.status === "fulfilled" ? supplierRes.value : null,
          lab: labRes.status === "fulfilled" ? labRes.value : null,
          billing: billingRes.status === "fulfilled" ? billingRes.value : null,
          rx: rxRes.status === "fulfilled" ? rxRes.value : null,
          stockIn: stockInRes.status === "fulfilled" ? stockInRes.value : null,
        });

        setRecentAppointments(
          recentApptRes.status === "fulfilled" ? recentApptRes.value?.data ?? [] : [],
        );
        setLowStockMedicines(
          lowStockRes.status === "fulfilled" ? lowStockRes.value?.data ?? [] : [],
        );
        setRecentBills(
          billListRes.status === "fulfilled" ? billListRes.value?.data ?? [] : [],
        );
        setRecentPrescriptions(
          rxListRes.status === "fulfilled" ? rxListRes.value?.data ?? [] : [],
        );
        setLastUpdated(new Date());
        setLoading(false);
      },
    );

    return () => {
      isMounted = false;
    };
  }, [
    dateRange,
    filters.appointmentStatus,
    isDoctor,
    refreshKey,
    user?.doctorId,
  ]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const statCards = useMemo(() => {
    const all = [
      {
        roles: ["admin", "doctor", "lab", "user"],
        label: "Active Patients",
        value: allStats?.patient?.active ?? "-",
        change:
          allStats?.patient?.addedThisMonth != null
            ? `+${allStats.patient.addedThisMonth} this month`
            : "",
        icon: Users,
        bg: "bg-primary-500/10",
        text: "text-primary-600",
      },
      {
        roles: ["admin", "doctor", "user"],
        label: "Today's Appointments",
        value: allStats?.appt?.todayCount ?? "-",
        change:
          allStats?.appt?.scheduled != null
            ? `${allStats.appt.scheduled} scheduled`
            : "",
        icon: CalendarCheck,
        bg: "bg-blue-500/10",
        text: "text-blue-600",
      },
      {
        roles: ["admin", "doctor"],
        label: "Prescriptions",
        value: allStats?.rx?.total ?? "-",
        change:
          allStats?.rx?.issuedToday != null
            ? `${allStats.rx.issuedToday} issued today`
            : "",
        icon: ClipboardList,
        bg: "bg-violet-500/10",
        text: "text-violet-600",
      },
      {
        roles: ["admin", "lab"],
        label: "Pending Lab Tests",
        value: allStats?.lab?.pendingRequests ?? "-",
        change:
          allStats?.lab?.todayRequests != null
            ? `${allStats.lab.todayRequests} today`
            : "",
        icon: FlaskConical,
        bg: "bg-rose-500/10",
        text: "text-rose-600",
      },
      {
        roles: ["admin", "user"],
        label: "Medicines",
        value: allStats?.med?.total ?? "-",
        change:
          allStats?.med?.outOfStock != null
            ? `${allStats.med.outOfStock} out of stock`
            : "",
        icon: Pill,
        bg: "bg-emerald-500/10",
        text: "text-emerald-600",
      },
      {
        roles: ["admin", "user"],
        label: "Low Stock Alerts",
        value: allStats?.med?.lowStock ?? "-",
        change:
          allStats?.med?.categories != null
            ? `${allStats.med.categories} categories`
            : "",
        icon: AlertTriangle,
        bg: "bg-orange-500/10",
        text: "text-orange-600",
      },
      {
        roles: ["admin", "user"],
        label: "Purchase Orders",
        value: allStats?.stockIn?.total ?? "-",
        change:
          allStats?.stockIn?.pending != null
            ? `${allStats.stockIn.pending} pending`
            : "",
        icon: PackageCheck,
        bg: "bg-cyan-500/10",
        text: "text-cyan-600",
      },
      {
        roles: ["admin", "user"],
        label: "Active Suppliers",
        value: allStats?.supplier?.active ?? "-",
        change:
          allStats?.supplier?.addedThisMonth != null
            ? `+${allStats.supplier.addedThisMonth} this month`
            : "",
        icon: Truck,
        bg: "bg-accent-500/10",
        text: "text-accent-600",
      },
      {
        roles: ["admin", "user"],
        label: "Billing Total",
        value: money(allStats?.billing?.totalAmount),
        change:
          allStats?.billing?.paidAmount != null
            ? `${money(allStats.billing.paidAmount)} paid`
            : "",
        icon: Receipt,
        bg: "bg-amber-500/10",
        text: "text-amber-600",
      },
      {
        roles: ["admin", "user"],
        label: "Outstanding",
        value: money(allStats?.billing?.unpaidAmount),
        change:
          allStats?.billing?.unpaidCount != null
            ? `${allStats.billing.unpaidCount} unpaid bills`
            : "",
        icon: Banknote,
        bg: "bg-red-500/10",
        text: "text-red-600",
      },
    ];

    return all.filter(
      (stat) => stat.roles.includes(role) || (isAdmin && stat.roles.includes("admin")),
    );
  }, [allStats, isAdmin, role]);

  const appointmentChart = [
    {
      label: "Scheduled",
      value: num(allStats?.appt?.scheduled),
      color: "bg-blue-500",
      stroke: "#3b82f6",
    },
    {
      label: "Completed",
      value: num(allStats?.appt?.completed),
      color: "bg-emerald-500",
      stroke: "#10b981",
    },
    {
      label: "Cancelled",
      value: num(allStats?.appt?.cancelled),
      color: "bg-red-500",
      stroke: "#ef4444",
    },
    {
      label: "No-show",
      value: num(allStats?.appt?.noShow),
      color: "bg-amber-500",
      stroke: "#f59e0b",
    },
  ];

  const chartFocus = isLab
    ? "lab"
    : filters.focus === "auto"
      ? isAdmin
        ? "billing"
        : "inventory"
      : filters.focus;

  const operationsChart =
    chartFocus === "lab"
      ? [
          {
            label: "Pending",
            value: num(allStats?.lab?.pendingRequests),
            color: "bg-rose-500",
            stroke: "#f43f5e",
          },
          {
            label: "Completed",
            value: num(allStats?.lab?.completedRequests),
            color: "bg-emerald-500",
            stroke: "#10b981",
          },
          {
            label: "Today",
            value: num(allStats?.lab?.todayRequests),
            color: "bg-blue-500",
            stroke: "#3b82f6",
          },
        ]
      : chartFocus === "billing"
        ? [
            {
              label: "Paid amount",
              value: num(allStats?.billing?.paidAmount),
              displayValue: money(allStats?.billing?.paidAmount),
              color: "bg-emerald-500",
              stroke: "#10b981",
            },
            {
              label: "Outstanding",
              value: num(allStats?.billing?.unpaidAmount),
              displayValue: money(allStats?.billing?.unpaidAmount),
              color: "bg-red-500",
              stroke: "#ef4444",
            },
            {
              label: "Total amount",
              value: num(allStats?.billing?.totalAmount),
              displayValue: money(allStats?.billing?.totalAmount),
              color: "bg-amber-500",
              stroke: "#f59e0b",
            },
          ]
        : [
            {
              label: "Medicines",
              value: num(allStats?.med?.total),
              color: "bg-emerald-500",
              stroke: "#10b981",
            },
            {
              label: "Low stock",
              value: num(allStats?.med?.lowStock),
              color: "bg-orange-500",
              stroke: "#f97316",
            },
            {
              label: "Purchase orders",
              value: num(allStats?.stockIn?.total),
              color: "bg-cyan-500",
              stroke: "#06b6d4",
            },
            {
              label: "Suppliers",
              value: num(allStats?.supplier?.active),
              color: "bg-violet-500",
              stroke: "#8b5cf6",
            },
          ];

  const chartTitle =
    chartFocus === "lab"
      ? "Lab Workload"
      : chartFocus === "billing"
        ? "Revenue & Collections"
        : "Inventory & Supply Pressure";

  const summaryItems = [
    {
      title: `${num(allStats?.appt?.scheduled)} scheduled appointments`,
      description: `${selectedPeriod} appointment workload with ${selectedStatus.toLowerCase()} filter.`,
      icon: CalendarCheck,
      bg: "bg-blue-500/10",
      text: "text-blue-600",
    },
    {
      title: `${num(allStats?.med?.lowStock)} low stock medicines`,
      description:
        num(allStats?.med?.outOfStock) > 0
          ? `${num(allStats?.med?.outOfStock)} medicines are out of stock.`
          : "No out-of-stock count reported in the current summary.",
      icon: AlertTriangle,
      bg: "bg-orange-500/10",
      text: "text-orange-600",
    },
    {
      title: `${money(allStats?.billing?.unpaidAmount)} outstanding`,
      description: `${num(allStats?.billing?.unpaidCount)} unpaid bills need follow-up.`,
      icon: Banknote,
      bg: "bg-red-500/10",
      text: "text-red-600",
    },
  ];

  const appointmentTotal = appointmentChart.reduce(
    (total, item) => total + num(item.value),
    0,
  );
  const billingTotal = num(allStats?.billing?.totalAmount);
  const collectionRate = percent(allStats?.billing?.paidAmount, billingTotal);
  const completionRate = percent(allStats?.appt?.completed, appointmentTotal);
  const labCompletionRate = percent(
    allStats?.lab?.completedRequests,
    num(allStats?.lab?.completedRequests) + num(allStats?.lab?.pendingRequests),
  );
  const stockRiskRate = percent(allStats?.med?.lowStock, allStats?.med?.total);

  const miniMetrics = [
    {
      label: "Appointment Completion",
      value: `${completionRate}%`,
      percent: completionRate,
      note: `${num(allStats?.appt?.completed)} completed from ${appointmentTotal} tracked appointments`,
      icon: CheckCircle2,
      bg: "bg-emerald-500/10",
      text: "text-emerald-600",
      bar: "bg-emerald-500",
    },
    {
      label: "Collection Rate",
      value: `${collectionRate}%`,
      percent: collectionRate,
      note: `${money(allStats?.billing?.paidAmount)} collected from ${money(billingTotal)}`,
      icon: TrendingUp,
      bg: "bg-blue-500/10",
      text: "text-blue-600",
      bar: "bg-blue-500",
    },
    {
      label: "Stock Risk",
      value: `${stockRiskRate}%`,
      percent: stockRiskRate,
      note: `${num(allStats?.med?.lowStock)} of ${num(allStats?.med?.total)} medicines are low stock`,
      icon: AlertTriangle,
      bg: "bg-orange-500/10",
      text: "text-orange-600",
      bar: "bg-orange-500",
    },
  ];

  const progressRows = [
    {
      label: "Appointments completed",
      value: `${completionRate}%`,
      percent: completionRate,
      color: "bg-emerald-500",
      note: "Completed compared with scheduled, cancelled, and no-show workload.",
    },
    {
      label: "Lab completion",
      value: `${labCompletionRate}%`,
      percent: labCompletionRate,
      color: "bg-rose-500",
      note: `${num(allStats?.lab?.pendingRequests)} lab requests still pending.`,
    },
    {
      label: "Billing collected",
      value: `${collectionRate}%`,
      percent: collectionRate,
      color: "bg-blue-500",
      note: `${money(allStats?.billing?.unpaidAmount)} remains outstanding.`,
    },
  ];

  const workloadCards = [
    {
      label: "Today Queue",
      value: num(allStats?.appt?.todayCount),
      note: "appointments today",
      icon: Clock3,
      bg: "bg-blue-500/10",
      text: "text-blue-600",
    },
    {
      label: "Lab Queue",
      value: num(allStats?.lab?.pendingRequests),
      note: "pending tests",
      icon: FlaskConical,
      bg: "bg-rose-500/10",
      text: "text-rose-600",
    },
    {
      label: "Stock Queue",
      value: num(allStats?.med?.lowStock),
      note: "items need reorder",
      icon: PackageCheck,
      bg: "bg-orange-500/10",
      text: "text-orange-600",
    },
    {
      label: "Billing Queue",
      value: num(allStats?.billing?.unpaidCount),
      note: "unpaid bills",
      icon: Receipt,
      bg: "bg-red-500/10",
      text: "text-red-600",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="glass-card p-6 border-primary-500/20">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 mb-1">
              {roleCopy.title}
            </h1>
            <p className="text-surface-500 text-sm max-w-2xl">
              {roleCopy.subtitle}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium">
              <Activity className="w-4 h-4" />
              {role.charAt(0).toUpperCase() + role.slice(1)} view
            </div>
            {lastUpdated && (
              <div className="text-xs text-surface-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <div className="flex items-center gap-2 min-w-[180px]">
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Filter className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-900">
                Dashboard Filters
              </p>
              <p className="text-xs text-surface-500">Refine operational lists</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <SelectField
              label="Period"
              value={filters.period}
              onChange={(value) => updateFilter("period", value)}
              options={PERIOD_OPTIONS}
            />
            <SelectField
              label="Appointment status"
              value={filters.appointmentStatus}
              onChange={(value) => updateFilter("appointmentStatus", value)}
              options={APPOINTMENT_STATUS_OPTIONS}
            />
            <SelectField
              label="Chart focus"
              value={filters.focus}
              onChange={(value) => updateFilter("focus", value)}
              options={FOCUS_OPTIONS}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 rounded-lg border border-surface-200 text-sm font-medium text-surface-700 hover:bg-surface-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {APPOINTMENT_STATUS_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => updateFilter("appointmentStatus", option.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filters.appointmentStatus === option.value
                  ? "border-primary-200 bg-primary-50 text-primary-700"
                  : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <MiniMetricStrip items={miniMetrics} loading={loading} />

      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-surface-800">Key Metrics</h2>
          <span className="text-xs text-surface-500">
            {selectedPeriod} / {selectedStatus}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <StatCard key={stat.label} stat={stat} loading={loading} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DonutChart
          title="Appointment Status Mix"
          subtitle="Overall status distribution from appointment stats"
          data={appointmentChart}
        />
        <BarChart
          title={chartTitle}
          subtitle={`Focus: ${chartFocus.charAt(0).toUpperCase() + chartFocus.slice(1)}`}
          data={operationsChart}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ProgressPanel
          title="Performance Progress"
          rows={progressRows}
          loading={loading}
        />
        <div className="xl:col-span-2 glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Target className="w-4 h-4 text-primary-600" />
            <h3 className="text-base font-semibold text-surface-900">
              Operational Queues
            </h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
              Loading...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {workloadCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-lg border border-surface-100 bg-surface-50/60 p-4"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center mb-3`}
                    >
                      <Icon className={`w-4 h-4 ${item.text}`} />
                    </div>
                    <p className="text-xs text-surface-500">{item.label}</p>
                    <p className="text-xl font-bold text-surface-900 mt-0.5">
                      {item.value}
                    </p>
                    <p className="text-xs text-surface-500 mt-1">
                      {item.note}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <InsightPanel items={summaryItems} loading={loading} />
        <div className="xl:col-span-2">
          <RecentAppointments
            appointments={recentAppointments}
            loading={loading}
            statusLabel={selectedStatus}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isAdmin ? (
          <ListPanel
            title="Recent Bills"
            items={recentBills}
            loading={loading}
            emptyText="No bills found"
            renderItem={(bill) => (
              <li
                key={bill.billId}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">
                    Bill #{bill.billId}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {bill.patientName || `Patient #${bill.patientId ?? "-"}`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-surface-900 shrink-0">
                  {money(bill.totalAmount)}
                </span>
              </li>
            )}
          />
        ) : isDoctor ? (
          <ListPanel
            title="Recent Prescriptions"
            items={recentPrescriptions}
            loading={loading}
            emptyText="No prescriptions found"
            renderItem={(rx) => (
              <li
                key={rx.prescriptionId}
                className="py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">
                    Prescription #{rx.prescriptionId}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {rx.patient
                      ? `${rx.patient.firstName} ${rx.patient.lastName}`
                      : "Patient"}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700 shrink-0">
                  {rx.itemCount || 0} items
                </span>
              </li>
            )}
          />
        ) : (
          <ListPanel
            title="Inventory Alerts"
            items={lowStockMedicines}
            loading={loading}
            emptyText="All medicines are sufficiently stocked"
            renderItem={(med) => {
              const qty = med.stock?.totalQuantity ?? 0;
              const isOut = qty === 0;
              return (
                <li
                  key={med.medicineId}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate">
                      {med.name}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {med.category ?? "Uncategorized"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      isOut
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {isOut ? "Out of stock" : `${qty} left`}
                  </span>
                </li>
              );
            }}
          />
        )}

        {isAdmin && (
          <ListPanel
            title="Inventory Alerts"
            items={lowStockMedicines}
            loading={loading}
            emptyText="All medicines are sufficiently stocked"
            renderItem={(med) => {
              const qty = med.stock?.totalQuantity ?? 0;
              const isOut = qty === 0;
              return (
                <li
                  key={med.medicineId}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate">
                      {med.name}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {med.category ?? "Uncategorized"}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      isOut
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {isOut ? "Out of stock" : `${qty} left`}
                  </span>
                </li>
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
