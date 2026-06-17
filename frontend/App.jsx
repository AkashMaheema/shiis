import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import AdminRoute from "./components/Auth/AdminRoute";
import DashboardLayout from "./components/Layout/DashboardLayout";
import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/Auth/Login";
import PatientList from "./pages/Patient/PatientList";
import PatientForm from "./pages/Patient/PatientForm";
import PatientDetail from "./pages/Patient/PatientDetail";
import UserList from "./pages/User/UserList";
import UserForm from "./pages/User/UserForm";
import AppointmentList from "./pages/Appointment/AppointmentList";
import AppointmentForm from "./pages/Appointment/AppointmentForm";
import AppointmentDetail from "./pages/Appointment/AppointmentDetail";
import LabList from "./pages/Lab/LabList";
import LabForm from "./pages/Lab/LabForm";
import LabDetail from "./pages/Lab/LabDetail";
import LabTestCatalog from "./pages/Lab/LabTestCatalog";
import SupplierList from "./pages/Supplier/SupplierList";
import SupplierForm from "./pages/Supplier/SupplierForm";
import SupplierDetail from "./pages/Supplier/SupplierDetail";
import { useAuth } from "./contexts/useAuth";

function ComingSoon({ name }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-100 border border-surface-300/50 flex items-center justify-center mb-4">
        <span className="text-2xl">{"\u{1F6A7}"}</span>
      </div>
      <h2 className="text-xl font-bold text-surface-900 mb-2">{name}</h2>
      <p className="text-sm text-surface-500 max-w-md">
        This module is under development. The foundation is in place and ready
        for backend integration.
      </p>
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />

            <Route path="/patients" element={<PatientList />} />
            <Route path="/patients/new" element={<PatientForm />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/patients/:id/edit" element={<PatientForm />} />

            <Route element={<AdminRoute />}>
              <Route path="/users" element={<UserList />} />
              <Route path="/users/new" element={<UserForm />} />
              <Route path="/users/:id/edit" element={<UserForm />} />
            </Route>

            <Route
              path="/doctors"
              element={<ComingSoon name="Doctor Management" />}
            />
            <Route
              path="/appointments"
              element={<AppointmentList />}
            />
            <Route
              path="/appointments/new"
              element={<AppointmentForm />}
            />
            <Route
              path="/appointments/:id"
              element={<AppointmentDetail />}
            />
            <Route
              path="/appointments/:id/edit"
              element={<AppointmentForm />}
            />
            <Route
              path="/prescriptions"
              element={<ComingSoon name="Prescription System" />}
            />
            <Route
              path="/inventory"
              element={<ComingSoon name="Inventory & Medicine" />}
            />
            <Route path="/suppliers" element={<SupplierList />} />
            <Route path="/suppliers/new" element={<SupplierForm />} />
            <Route path="/suppliers/:id" element={<SupplierDetail />} />
            <Route path="/suppliers/:id/edit" element={<SupplierForm />} />
            <Route
              path="/billing"
              element={<ComingSoon name="Billing System" />}
            />
            <Route path="/lab" element={<LabList />} />
            <Route path="/lab/new" element={<LabForm />} />
            <Route path="/lab/tests" element={<LabTestCatalog />} />
            <Route path="/lab/:id" element={<LabDetail />} />
            <Route path="/lab/:id/edit" element={<LabForm />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
