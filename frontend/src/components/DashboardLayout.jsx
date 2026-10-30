import { Outlet } from "react-router-dom";
import Navbar from "../components/NavBar/Navbar.jsx";
import Sidebar from "../components/Sidebar/sidebar.jsx";

const DashboardLayout = () => {
  return (
    <div className="d-flex">
      <Sidebar />

      <div className="flex-grow-1">
        <Navbar />

        <main className="p-4">
          
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
