import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

const pageTitles = {
  "/": "Dashboard",
  "/users": "User Management",
  "/users/new": "Create User",
  "/patients": "Patient Management",
  "/patients/new": "Register Patient",
  "/doctors": "Doctor Management",
  "/appointments": "Appointments",
  "/prescriptions": "Prescriptions",
  "/inventory": "Inventory & Medicine",
  "/suppliers": "Suppliers & Orders",
  "/suppliers/new": "New Supplier",
  "/stock-in": "Stock In",
  "/stock-in/new": "New Purchase Order",
  "/billing": "Billing",
  "/lab": "Lab Management",
};

export default function DashboardLayout() {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Match title from path (handle dynamic routes like /patients/:id/edit)
  const title =
    pageTitles[location.pathname] ||
    (location.pathname.includes("/users")
      ? "User Management"
      : location.pathname.includes("/patients") &&
          location.pathname.endsWith("/edit")
        ? "Edit Patient"
        : location.pathname.includes("/patients") &&
            !location.pathname.endsWith("/new")
          ? "Patient Details"
          : location.pathname.includes("/patients")
            ? "Patient Management"
            : "SHIIS");

  return (
    <div className="flex min-h-screen bg-surface-100">
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main content offset follows sidebar width */}
      <div
        className={`flex-1 transition-all duration-300 flex flex-col ${
          isSidebarCollapsed ? "ml-20" : "ml-[260px]"
        }`}
      >
        <Header title={title} />

        <main className="flex-1 p-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
