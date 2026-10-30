import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar/Sidebar.jsx";
import NavBar from "./components/Navbar/Navbar.jsx";

import AddPatient from "./pages/patients/AddPatient";
import PatientList from "./pages/patients/PatientList.jsx";
import EditPatient from "./pages/patients/EditPatient.jsx";

import Login from "./pages/LoginSignupPages/Login.jsx";
import Register from "./pages/LoginSignupPages/Register.jsx";

import PatientConsultations from "./pages/consultations/PatientConsultations.jsx";
import CreateConsultation from "./pages/consultations/CreateConsultaion.jsx";
import ConsultationDetails from "./pages/consultations/ConsultationDetails.jsx";
import ConsultationList from "./pages/consultations/ConsultationList.jsx";

import { usePatientSync } from "./hooks/usePatientSync.js";
import { initializeSyncManager } from "./services/syncManager.js";

import SyncOperation from "./pages/SyncOperations/SyncOperationList.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";

function AppLayout() {
  useEffect(() => {
    const cleanup = initializeSyncManager();
    return cleanup;
  }, []);

  usePatientSync();

  return (
    <div className="d-flex">
      <Sidebar />

      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <NavBar />

        <main style={{ flexGrow: 1, padding: "20px" }}>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/add/patient" element={<AddPatient />} />
            <Route path="/patients" element={<PatientList />} />
            <Route path="/edit/patient/:id" element={<EditPatient />} />

            <Route
              path="/patients/:patientId/consultations"
              element={<PatientConsultations />}
            />

            <Route
              path="/createConsultations/:patientId"
              element={<CreateConsultation />}
            />

            <Route
              path="/consultations/:id"
              element={<ConsultationDetails />}
            />

            <Route path="/consultations" element={<ConsultationList />} />

            <Route path="/sync-operations" element={<SyncOperation />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/register" replace />} />

        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} />

        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
