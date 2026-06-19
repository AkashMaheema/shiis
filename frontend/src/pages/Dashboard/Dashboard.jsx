import { useEffect, useState } from "react";
import {
  Users,
  Truck,
  CalendarCheck,
  Pill,
  Calendar,
  FlaskConical,
  AlertTriangle,
  Activity,
} from "lucide-react";
import patientService from "../../api/services/patientService";
import appointmentService from "../../api/services/appointmentService";
import medicineService from "../../api/services/medicineService";
import supplierService from "../../api/services/supplierService";
import labService from "../../api/services/labService";

const STATUS_COLORS = {
  Scheduled: "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-red-100 text-red-700",
  "No-Show": "bg-amber-100 text-amber-700",
};

export default function Dashboard() {
  const [allStats, setAllStats] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [lowStockMedicines, setLowStockMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      patientService.getStats(),
      appointmentService.getStats(),
      medicineService.getStats(),
      supplierService.getStats(),
      labService.getStats(),
      appointmentService.getAll(1, 5),
      medicineService.getAll(1, 8, { lowStockOnly: true }),
    ]).then(
      ([patientRes, apptRes, medRes, supplierRes, labRes, recentApptRes, lowStockRes]) => {
        setAllStats({
          patient: patientRes.status === "fulfilled" ? patientRes.value : null,
          appt: apptRes.status === "fulfilled" ? apptRes.value : null,
          med: medRes.status === "fulfilled" ? medRes.value : null,
          supplier: supplierRes.status === "fulfilled" ? supplierRes.value : null,
          lab: labRes.status === "fulfilled" ? labRes.value : null,
        });

        if (recentApptRes.status === "fulfilled") {
          setRecentAppointments(recentApptRes.value?.data ?? []);
        }
        if (lowStockRes.status === "fulfilled") {
          setLowStockMedicines(lowStockRes.value?.data ?? []);
        }

        setLoading(false);
      },
    );
  }, []);

  const val = (v) => (loading ? "…" : v != null ? String(v) : "—");

  const statCards = [
    {
      label: "Total Patients",
      value: val(allStats?.patient?.active),
      change:
        allStats?.patient?.addedThisMonth != null
          ? `+${allStats.patient.addedThisMonth} this month`
          : "",
      icon: Users,
      bg: "bg-primary-500/10",
      text: "text-primary-600",
    },
    {
      label: "Active Suppliers",
      value: val(allStats?.supplier?.active),
      change:
        allStats?.supplier?.addedThisMonth != null
          ? `+${allStats.supplier.addedThisMonth} this month`
          : "",
      icon: Truck,
      bg: "bg-accent-500/10",
      text: "text-accent-600",
    },
    {
      label: "Today's Appointments",
      value: val(allStats?.appt?.todayCount),
      change:
        allStats?.appt?.scheduled != null
          ? `${allStats.appt.scheduled} scheduled`
          : "",
      icon: CalendarCheck,
      bg: "bg-blue-500/10",
      text: "text-blue-600",
    },
    {
      label: "Medicines in Stock",
      value: val(allStats?.med?.total),
      change:
        allStats?.med?.outOfStock != null
          ? `${allStats.med.outOfStock} out of stock`
          : "",
      icon: Pill,
      bg: "bg-emerald-500/10",
      text: "text-emerald-600",
    },
    {
      label: "Scheduled Appointments",
      value: val(allStats?.appt?.scheduled),
      change:
        allStats?.appt?.completed != null
          ? `${allStats.appt.completed} completed`
          : "",
      icon: Calendar,
      bg: "bg-amber-500/10",
      text: "text-amber-600",
    },
    {
      label: "Pending Lab Tests",
      value: val(allStats?.lab?.pendingRequests),
      change:
        allStats?.lab?.todayRequests != null
          ? `${allStats.lab.todayRequests} today`
          : "",
      icon: FlaskConical,
      bg: "bg-rose-500/10",
      text: "text-rose-600",
    },
    {
      label: "Low Stock Alerts",
      value: val(allStats?.med?.lowStock),
      change:
        allStats?.med?.outOfStock != null
          ? `${allStats.med.outOfStock} out of stock`
          : "",
      icon: AlertTriangle,
      bg: "bg-orange-500/10",
      text: "text-orange-600",
    },
    {
      label: "Lab Tests Today",
      value: val(allStats?.lab?.todayRequests),
      change:
        allStats?.lab?.completedRequests != null
          ? `${allStats.lab.completedRequests} completed total`
          : "",
      icon: Activity,
      bg: "bg-violet-500/10",
      text: "text-violet-600",
    },
  ];

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
        {statCards.map((stat) => (
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
                <p className="text-xs text-surface-400 mt-0.5">{stat.change}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Live Data Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-surface-900 mb-4">
            Recent Appointments
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
              Loading…
            </div>
          ) : recentAppointments.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
              No appointments found
            </div>
          ) : (
            <ul className="divide-y divide-surface-200">
              {recentAppointments.map((appt) => (
                <li
                  key={appt.appointmentId}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-surface-900 truncate">
                      {appt.patient
                        ? `${appt.patient.firstName} ${appt.patient.lastName}`
                        : `Patient #${appt.patientId}`}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {appt.appointmentDate
                        ? new Date(appt.appointmentDate).toLocaleDateString()
                        : "—"}
                      {appt.appointmentTime ? ` · ${appt.appointmentTime}` : ""}
                      {appt.reason ? ` · ${appt.reason}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      STATUS_COLORS[appt.status] ?? "bg-surface-100 text-surface-600"
                    }`}
                  >
                    {appt.status ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Inventory Alerts */}
        <div className="glass-card p-6">
          <h3 className="text-base font-semibold text-surface-900 mb-4">
            Inventory Alerts
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-40 text-surface-400 text-sm">
              Loading…
            </div>
          ) : lowStockMedicines.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-emerald-600 text-sm font-medium">
              All medicines are sufficiently stocked
            </div>
          ) : (
            <ul className="divide-y divide-surface-200">
              {lowStockMedicines.map((med) => {
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
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
