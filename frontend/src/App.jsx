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
import { useAuth } from "./contexts/useAuth";
import PrescriptionList from "./pages/Prescription/PrescriptionList";
import PrescriptionForm from "./pages/Prescription/PrescriptionForm";
import PrescriptionDetail from "./pages/Prescription/PrescriptionDetail";

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
              element={<ComingSoon name="Appointment System" />}
            />
            <Route path="/prescriptions" element={<PrescriptionList />} />
            <Route path="/prescriptions/new" element={<PrescriptionForm />} />
            <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />
            <Route path="/prescriptions/:id/edit" element={<PrescriptionForm />} />
            <Route
              path="/inventory"
              element={<ComingSoon name="Inventory & Medicine" />}
            />
            <Route
              path="/suppliers"
              element={<ComingSoon name="Suppliers & Purchase Orders" />}
            />
            <Route
              path="/billing"
              element={<ComingSoon name="Billing System" />}
            />
            <Route path="/lab" element={<ComingSoon name="Lab Management" />} />
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
