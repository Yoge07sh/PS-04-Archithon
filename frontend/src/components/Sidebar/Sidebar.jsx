import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ListGroup } from "react-bootstrap";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Sidebar.css";

function Sidebar() {
  const [menuOpen, setMenuOpen] = useState(false);

  // ================= MENU ITEMS =================
  const menuItems = [
    {
      path: "/admin/dashboard",
      icon: "bi-speedometer2",
      label: "Dashboard",
    },
    {
      path: "/patients",
      icon: "bi-people",
      label: "Patients",
    },

    {
      path: "/consultations",
      icon: "bi-journal-medical",
      label: "Consultations",
    },
    {
      path: "/sync-operations",
      icon: "bi-arrow-repeat",
      label: "Sync Operations",
    },
  ];

  // ================= MENU LINK =================
  const renderItems = (items) => (
    <ListGroup variant="flush">
      {items.map((item) => (
        <ListGroup.Item
          key={item.path}
          as={NavLink}
          to={item.path}
          end={
            item.path === "/admin/dashboard" ||
            item.path === "/patients" ||
            item.path === "/consultations"
          }
          onClick={() => setMenuOpen(false)}
          className="sidebar-link border-0 rounded-3 mb-1 px-3 py-2"
        >
          <i className={`bi ${item.icon} me-3`}></i>
          <span className="fw-medium">{item.label}</span>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );

  return (
    <>
      {/* MOBILE HAMBURGER */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMenuOpen(true)}
        aria-label="Open sidebar"
      >
        <i className="bi bi-list"></i>
      </button>

      {/* MOBILE OVERLAY */}
      {menuOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}

      {/* SIDEBAR */}
      <div className={`sidebar d-flex flex-column ${menuOpen ? "show" : ""}`}>
        {/* LOGO */}
        <div className="px-3 py-4 d-flex align-items-center gap-2">
          <div className="sidebar-logo">
            <i className="bi bi-heart-pulse fs-4"></i>
          </div>

          <div>
            <h5 className="mb-0 fw-bold sidebar-brand">MediAI</h5>
            <small className="text-secondary">Healthcare Intelligence</small>
          </div>

          {/* MOBILE CLOSE BUTTON */}
          <button
            className="sidebar-close-btn ms-auto"
            onClick={() => setMenuOpen(false)}
            aria-label="Close sidebar"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <hr className="mx-3 my-0" />

        {/* NAVIGATION */}
        <div className="flex-grow-1 overflow-auto px-3 py-3 main-menu">
          <div className="text-uppercase fw-semibold mb-2 px-2 sidebar-heading">
            Main Menu
          </div>

          {renderItems(menuItems)}

          {/* AI CARD */}
        </div>

        {/* FOOTER */}
        <div className="p-3 border-top sidebar-footer">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-shield-check fs-4 text-success"></i>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
