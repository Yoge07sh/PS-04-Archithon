import { useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await axios.post(
        `${apiUrl}/logout`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Logout failed:", error.response?.data || error.message);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("name");
      localStorage.removeItem("email");

      navigate("/login", { replace: true });
      setLoggingOut(false);
    }
  };

  return (
    <nav className="medical-navbar">

      {/* Left Branding */}
      <div className="navbar-brand-section">
        <div className="navbar-ai-icon">
          <i className="bi bi-heart-pulse-fill"></i>
        </div>

        <div className="navbar-brand-text">
          <h5>MedIAI <span>Assistant</span></h5>
          <small>Intelligent Healthcare System</small>
        </div>
      </div>

      {/* Center AI Status */}
      <div className="navbar-center">
        <div className="ai-status">
          <span className="status-dot"></span>
          AI System Active
        </div>

        <div className="navbar-divider"></div>

        <div className="navbar-tagline">
          <i className="bi bi-shield-check"></i>
          Smart & Secure Healthcare
        </div>
      </div>

      {/* Right Actions */}
      <div className="navbar-actions">
        <div className="navbar-notification">
          <i className="bi bi-bell"></i>
        </div>

        <Button
          variant="success"
          className="logout-btn"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Logging out...
            </>
          ) : (
            <>
              <i className="bi bi-box-arrow-right me-2"></i>
              Logout
            </>
          )}
        </Button>
      </div>

    </nav>
  );
}

export default Navbar;