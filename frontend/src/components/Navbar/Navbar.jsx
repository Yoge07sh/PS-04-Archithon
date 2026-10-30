
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
      console.error(
        "Logout failed:",
        error.response?.data || error.message
      );
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
      <div className="navbar-left">
        <Button
          variant="success"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <>
              <Spinner
                animation="border"
                size="sm"
                className="me-2"
              />
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