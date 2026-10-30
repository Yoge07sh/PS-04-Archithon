import { useEffect, useState } from "react";
//import React from 'react'
import axios from "axios";
import { useNavigate } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_URL;

function Dashboard() {
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalConsultations, setTotalConsultations] = useState(0);
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const stats = [
    {
      title: "Total Patients",
      value: loading ? "..." : totalPatients.toLocaleString("en-IN"),
      icon: "bi-people",
      bg: "bg-primary-subtle",
      color: "text-primary",
      change: "Registered patients",
    },
    {
      title: "Total Consultations",
      value: loading ? "..." : totalConsultations.toLocaleString("en-IN"),
      icon: "bi-calendar-check",
      bg: "bg-warning-subtle",
      color: "text-warning",
      change: "Total consultations recorded",
    },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Total Patients
        const patientResponse = await axios.get(`${apiUrl}/patients`, {
          withCredentials: true,
        });

        const patientData = patientResponse.data;

        setTotalPatients(
          Number(
            patientData.totalPatients ?? patientData.data?.totalPatients ?? 0,
          ),
        );

        // Recent Patients
        const recentResponse = await axios.get(`${apiUrl}/patients/recent`, {
          withCredentials: true,
        });

        setRecentPatients(recentResponse.data.data || []);

        // Total Consultations
        const consultationResponse = await axios.get(
          `${apiUrl}/consultations`,
          {
            withCredentials: true,
          },
        );

        const consultationData = consultationResponse.data;

        const consultations = Array.isArray(consultationData)
          ? consultationData
          : (consultationData.consultations ?? consultationData.data ?? []);

        const total =
          consultationData.totalConsultations ??
          consultationData.total ??
          consultationData.pagination?.total ??
          consultations.length;

        setTotalConsultations(Number(total) || 0);
      } catch (error) {
        console.error(
          "Dashboard API Error:",
          error.response?.data || error.message,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="container-fluid bg-light min-vh-100 p-3 p-md-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">Dashboard Overview</h3>
          <p className="text-secondary mb-0">
            Welcome back! Here's what's happening in your hospital.
          </p>
        </div>

        <button className="btn btn-white border shadow-sm">
          <i className="bi bi-calendar3 me-2"></i>
          Today
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="row g-6 mb-4">
        {stats.map((item, index) => (
          <div className="col-12 col-sm-6 col-xl-6" key={index}>
            <div className="card border-0 shadow-sm rounded-4 h-100">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-secondary mb-2">{item.title}</p>
                    <h3 className="fw-bold text-dark mb-0">{item.value}</h3>
                  </div>

                  <div className={`${item.bg} ${item.color} rounded-3 p-3`}>
                    <i className={`bi ${item.icon} fs-3`}></i>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-success small fw-semibold">
                    <i className="bi bi-graph-up-arrow me-1"></i>
                    {item.change}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="row g-4">
        {/* Recent Patients */}
        <div className="col-12 col-xl-8">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-header bg-white border-0 p-4 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">Recent Patients</h5>

              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => navigate("/patients")}
              >
                View All
              </button>
            </div>

            <div className="card-body pt-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="py-3">Patient Name</th>
                      <th>Pnone No.</th>
                      <th>Gender</th>
                      <th>dateOfBirth</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentPatients.length > 0 ? (
                      recentPatients.map((patient) => (
                        <tr key={patient._id}>
                          <td className="fw-semibold text-dark">
                            {patient.firstName} {patient.lastName}
                          </td>

                          <td className="text-secondary">
                            {patient.contactNumber}
                          </td>

                          <td>{patient.gender}</td>

                          <td>{formatDate(patient.dateOfBirth)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-4 text-secondary"
                        >
                          No recent patients found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* AI Assistant */}
        <div className="col-12 col-xl-4">
          <div
            className="card border-0 shadow-sm rounded-4 h-100 text-white"
            style={{
              background: "linear-gradient(135deg, #0f766e, #0891b2)",
            }}
          >
            <div className="card-body p-4 d-flex flex-column justify-content-center">
              <div className="bg-white bg-opacity-25 rounded-3 p-3 mb-3 align-self-start">
                <i className="bi bi-robot fs-2"></i>
              </div>

              <h4 className="fw-bold">AI Health Assistant</h4>

              <p className="text-white-50">
                Analyze medical reports and get AI-powered insights. All
                AI-generated results should be reviewed by a qualified doctor.
              </p>

              <button className="btn btn-light text-success fw-semibold align-self-start mt-2">
                Explore AI Analysis
                <i className="bi bi-arrow-right ms-2"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Overview */}
      {/* <div className="card border-0 shadow-sm rounded-4 mt-4">

        <div className="card-body p-4">
          <h5 className="fw-bold mb-4">
            Quick Overview
          </h5>

          <div className="row g-3">

            <div className="col-12 col-md-4">
              <div className="bg-light rounded-3 p-3 d-flex align-items-center gap-3">
                <i className="bi bi-calendar-event fs-3 text-primary"></i>

                <div>
                  <p className="text-secondary small mb-1">
                    Upcoming Appointments
                  </p>
                  <h5 className="fw-bold mb-0">24</h5>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="bg-light rounded-3 p-3 d-flex align-items-center gap-3">
                <i className="bi bi-file-earmark-medical fs-3 text-success"></i>

                <div>
                  <p className="text-secondary small mb-1">
                    Reports Generated
                  </p>
                  <h5 className="fw-bold mb-0">86</h5>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="bg-light rounded-3 p-3 d-flex align-items-center gap-3">
                <i className="bi bi-clock-history fs-3 text-warning"></i>

                <div>
                  <p className="text-secondary small mb-1">
                    Pending Reviews
                  </p>
                  <h5 className="fw-bold mb-0">12</h5>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div> */}
    </div>
  );
}

export default Dashboard;
