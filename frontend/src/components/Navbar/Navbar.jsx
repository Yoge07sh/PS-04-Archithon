
import { Dropdown, Form, Image } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import "./Navbar.css";

function Navbar() {

  const navigate = useNavigate();

  // ================= LOGOUT =================
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("name");
    localStorage.removeItem("email");

    navigate("/login");
  };

  const adminName = localStorage.getItem("name") || "Admin";

  return (
    <nav className="medical-navbar">

      {/* ================= LEFT SEARCH ================= */}
     
      {/* ================= RIGHT SECTION ================= */}
      <div className="navbar-right">

        
        {/* PROFILE DROPDOWN */}
        <Dropdown align="end">

          <Dropdown.Toggle
            variant="light"
            className="profile-dropdown"
            id="profile-dropdown"
          >

            <Image
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=0d9488&color=fff`}
              roundedCircle
              width="38"
              height="38"
              alt="Admin profile"
            />

            <div className="profile-info">

              <span className="profile-name">
                {adminName}
              </span>

              <small>Administrator</small>

            </div>

            <i className="bi bi-chevron-down profile-arrow"></i>

          </Dropdown.Toggle>

          <Dropdown.Menu className="navbar-dropdown">

            <Dropdown.Header>
              My Account
            </Dropdown.Header>

            <Dropdown.Item
              onClick={() => navigate("/profile")}
            >
              <i className="bi bi-person me-2"></i>
              My Profile
            </Dropdown.Item>

            <Dropdown.Item
              onClick={() => navigate("/settings")}
            >
              <i className="bi bi-gear me-2"></i>
              Settings
            </Dropdown.Item>

            <Dropdown.Divider />

            <Dropdown.Item
              onClick={handleLogout}
              className="text-danger"
            >
              <i className="bi bi-box-arrow-right me-2"></i>
              Logout
            </Dropdown.Item>

          </Dropdown.Menu>

        </Dropdown>

      </div>

    </nav>
  );
}

export default Navbar;
