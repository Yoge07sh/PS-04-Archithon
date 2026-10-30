import { Outlet } from "react-router-dom";
import Navbar from "./NavBar/Navbar.jsx";
import Sidebar from "./Sidebar/Sidebar.jsx";

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
