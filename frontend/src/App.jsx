import { BrowserRouter, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar/Sidebar.jsx";
import NavBar from "./components/Navbar/Navbar.jsx";

// import WelcomePage from "./pages/Dashboard/Dashboard";
import AddPatient from "./pages/patients/AddPatient";
import PatientList from "./pages/patients/PatientList.jsx";
import Login from "./pages/LoginSignupPages/Login.jsx";
import EditPatient from "./pages/patients/EditPatient.jsx";
import Register from "./pages/LoginSignupPages/Register.jsx";
import { usePatientSync } from "./hooks/usePatientSync.js";
function App() {
  usePatientSync();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="*"
          element={
            <div className="d-flex">
              <Sidebar />

              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <NavBar />
                <main
                  style={{
                    flexGrow: 1,
                    padding: "20px",
                    marginTop: "70px",
                  }}
                >
                  <Routes>
                    <Route path="/add/patient" element={<AddPatient />}></Route>
                    <Route path="/patients" element={<PatientList />}></Route>
                    <Route
                      path="/edit/patient/:id"
                      element={<EditPatient />}
                    ></Route>
                  </Routes>
                </main>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
