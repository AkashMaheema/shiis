import { useEffect, useState } from "react";
import {
  Users,
  Stethoscope,
  CalendarCheck,
  Pill,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  FlaskConical,
} from "lucide-react";
import labService from "../../api/services/labService";

const baseStats = [
  {
    label: "Total Patients",
    value: "—",
    change: "",
    icon: Users,
    color: "from-primary-500 to-primary-600",
    bg: "bg-primary-500/10",
    text: "text-primary-600",
  },
  {
    label: "Active Doctors",
    value: "—",
    change: "",
    icon: Stethoscope,
    color: "from-accent-500 to-accent-600",
    bg: "bg-accent-500/10",
    text: "text-accent-600",
  },
  {
    label: "Today's Appointments",
    value: "—",
    change: "",
    icon: CalendarCheck,
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-500/10",
    text: "text-blue-600",
  },
  {
    label: "Medicines in Stock",
    value: "—",
    change: "",
    icon: Pill,
    color: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
  },
  {
    label: "Monthly Revenue",
    value: "—",
    change: "",
    icon: DollarSign,
    color: "from-amber-500 to-amber-600",
    bg: "bg-amber-500/10",
    text: "text-amber-600",
  },
  {
    label: "Pending Lab Tests",
    value: "—",
    change: "",
    icon: FlaskConical,
    color: "from-rose-500 to-rose-600",
    bg: "bg-rose-500/10",
    text: "text-rose-600",
  },
  {
    label: "Low Stock Alerts",
    value: "—",
    change: "",
    icon: AlertTriangle,
    color: "from-orange-500 to-orange-600",
    bg: "bg-orange-500/10",
    text: "text-orange-600",
  },
  {
    label: "Revenue Trend",
    value: "—",
    change: "",
    icon: TrendingUp,
    color: "from-violet-500 to-violet-600",
    bg: "bg-violet-500/10",
    text: "text-violet-600",
  },
];

export default function Dashboard() {
  const [pendingLab, setPendingLab] = useState("—");

  useEffect(() => {
    labService
      .getStats()
      .then((s) => setPendingLab(String(s.pendingRequests ?? "—")))
      .catch(() => setPendingLab("—"));
  }, []);

  const stats = baseStats.map((s) =>
    s.label === "Pending Lab Tests" ? { ...s, value: pendingLab } : s,
  );

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="glass-card p-6 bg-gradient-to-r from-primary-500/10 via-accent-500/5 to-transparent border-primary-500/20">
        <h1 className="text-2xl font-bold text-surface-900 mb-1">
          Welcome to SHIIS
        </h1>
        <p className="text-surface-500 text-sm max-w-xl">
          Smart Healthcare &amp; Inventory Intelligence System — your
          centralized hub for patient management, inventory tracking, lab
          operations, and business analytics.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass-card p-5 flex items-start gap-4 group hover:scale-[1.02] transition-transform duration-200"
          >
            <div
              className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}
            >
              <stat.icon className={`w-5 h-5 ${stat.text}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-surface-500 truncate">{stat.label}</p>
              <p className="text-xl font-bold text-surface-900 mt-0.5">
                {stat.value}
              </p>
              {stat.change && (
                <p className="text-xs text-emerald-600 mt-0.5">{stat.change}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-surface-900 mb-4">
            Recent Appointments
          </h3>
          <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
            Connect modules to display live data
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-surface-900 mb-4">
            Inventory Alerts
          </h3>
          <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
            Connect modules to display live data
          </div>
        </div>
      </div>
    </div>
  );
}
