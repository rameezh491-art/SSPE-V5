import "@/App.css";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import DoctorDashboard from "@/pages/DoctorDashboard";
import PatientWizard from "@/pages/PatientWizard";
import PatientDetail from "@/pages/PatientDetail";
import AdminDashboard from "@/pages/AdminDashboard";
import DataCollectorRegister from "@/pages/DataCollectorRegister";
import DataCollectorDashboard from "@/pages/DataCollectorDashboard";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-data-collector" element={<DataCollectorRegister />} />
            <Route path="/admin/login" element={<Login adminMode />} />

            <Route path="/doctor" element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />
            <Route path="/doctor/patients/new" element={<ProtectedRoute role="doctor"><PatientWizard /></ProtectedRoute>} />
            <Route path="/doctor/patients/:id" element={<ProtectedRoute role={["doctor","data_collector"]}><PatientDetail /></ProtectedRoute>} />
            <Route path="/doctor/patients/:id/edit" element={<ProtectedRoute role={["doctor","data_collector"]}><PatientWizard /></ProtectedRoute>} />

            <Route path="/data-collector" element={<ProtectedRoute role="data_collector"><DataCollectorDashboard /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
