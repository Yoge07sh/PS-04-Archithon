import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  savePatientsLocally,
  getLocalPatients,
} from "../../db/patientStorage.js";

import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Form,
  Button,
  InputGroup,
  Badge,
  Spinner,
  Alert,
  Modal,
} from "react-bootstrap";

import {
  FaUserPlus,
  FaUsers,
  FaSearch,
  FaUserInjured,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaVenusMars,
  FaEdit,
  FaTrash,
  FaTimes,
  FaSyncAlt,
  FaHospitalUser,
  FaPlus,
} from "react-icons/fa";

import "bootstrap/dist/css/bootstrap.min.css";

const apiUrl = import.meta.env.VITE_API_URL;

function PatientList() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [patientToDelete, setPatientToDelete] = useState(null);

  // Fetch patients from server, with offline fallback.
  const fetchPatients = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${apiUrl}/patients`, {
        withCredentials: true,
        timeout: 10000,
      });

      const patientData = Array.isArray(response.data)
        ? response.data
        : (response.data?.patients ?? response.data?.data);

      if (!Array.isArray(patientData)) {
        throw new Error("Invalid patient data received from server.");
      }

      await savePatientsLocally(patientData);
      setPatients(patientData);
    } catch (err) {
      console.error("Unable to fetch patients from backend:", err);

      try {
        const localPatients = await getLocalPatients();

        setPatients(localPatients);

        if (localPatients.length > 0) {
          setError("You're offline. Showing previously saved patient records.");
        } else {
          setError(
            "Unable to connect to the server. No locally saved patient records are available.",
          );
        }
      } catch (localError) {
        console.error("Unable to read local patients:", localError);

        setPatients([]);
        setError(
          "Unable to load patient records from the server or local storage.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();

    const handlePatientsSynced = () => fetchPatients();

    window.addEventListener("patients-synced", handlePatientsSynced);

    return () => {
      window.removeEventListener("patients-synced", handlePatientsSynced);
    };
  }, []);

  // Search patients by name, contact, address, or patient code.
  const filteredPatients = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) return patients;

    return patients.filter((patient) => {
      const fullName =
        `${patient.firstName || ""} ${patient.lastName || ""}`.toLowerCase();

      const contact = String(patient.contactNumber || "").toLowerCase();
      const address = String(patient.address || "").toLowerCase();
      const patientCode = String(patient.patientCode || "").toLowerCase();

      return (
        fullName.includes(searchText) ||
        contact.includes(searchText) ||
        address.includes(searchText) ||
        patientCode.includes(searchText)
      );
    });
  }, [patients, search]);

  // Format date of birth.
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

  // Gender badge.
  const getGenderBadge = (gender) => {
    const normalizedGender = (gender || "Undisclosed").toLowerCase();

    const variants = {
      male: "primary",
      female: "danger",
      other: "info",
      undisclosed: "secondary",
    };

    return (
      <Badge
        bg={variants[normalizedGender] || "secondary"}
        className="px-3 py-2 rounded-pill fw-medium"
      >
        {normalizedGender.charAt(0).toUpperCase() + normalizedGender.slice(1)}
      </Badge>
    );
  };

  // Delete patient.
  const deletePatient = async () => {
    if (!patientToDelete?._id) return;

    try {
      setDeletingId(patientToDelete._id);
      setError("");

      const response = await axios.delete(
        `${apiUrl}/delete-patient/${patientToDelete._id}`,
        { withCredentials: true },
      );

      setPatients((previous) =>
        previous.filter((patient) => patient._id !== patientToDelete._id),
      );

      setPatientToDelete(null);

      // Keep the user's feedback within the page.
      setError("");
      window.alert(response.data?.message || "Patient deleted successfully.");
    } catch (err) {
      console.error("Error deleting patient:", err);

      setError(
        err.response?.data?.message ||
          "Unable to delete patient. Please try again.",
      );

      setPatientToDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Container fluid className="patient-page py-4 px-3 px-lg-4">
      {/* Page header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <div className="patient-heading-icon">
            <FaHospitalUser size={25} />
          </div>

          <div>
            <h2 className="patient-page-title mb-1">Patient Management</h2>
            <p className="text-secondary mb-0">
              Manage patient profiles and personal information.
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Button
            variant="light"
            className="patient-refresh-btn"
            onClick={fetchPatients}
            disabled={loading}
            title="Refresh patients"
          >
            <FaSyncAlt className={loading ? "fa-spin" : ""} />
          </Button>

          <Button
            className="patient-add-btn"
            onClick={() => navigate("/add/patient")}
          >
            <FaUserPlus className="me-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={4}>
          <Card className="patient-stat-card h-100">
            <Card.Body className="d-flex align-items-center gap-3 p-4">
              <div className="patient-stat-icon">
                <FaUsers size={23} />
              </div>

              <div>
                <p className="text-secondary mb-1 small">Total Patients</p>
                <h3 className="fw-bold mb-0">{patients.length}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl={4}>
          <Card className="patient-stat-card h-100">
            <Card.Body className="d-flex align-items-center gap-3 p-4">
              <div className="patient-stat-icon patient-stat-icon-green">
                <FaSearch size={22} />
              </div>

              <div>
                <p className="text-secondary mb-1 small">Matching Results</p>
                <h3 className="fw-bold mb-0">{filteredPatients.length}</h3>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl={4}>
          <Card className="patient-stat-card h-100">
            <Card.Body className="d-flex align-items-center gap-3 p-4">
              <div className="patient-stat-icon patient-stat-icon-purple">
                <FaUserInjured size={22} />
              </div>

              <div>
                <p className="text-secondary mb-1 small">Directory Status</p>
                <h6 className="fw-bold mb-0">
                  {loading
                    ? "Loading..."
                    : error
                      ? "Offline / Attention"
                      : "Available"}
                </h6>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Patient directory */}
      <Card className="patient-directory-card border-0">
        <Card.Body className="p-0">
          <div className="patient-directory-header p-3 p-lg-4">
            <Row className="align-items-center g-3">
              <Col xs={12} lg>
                <h5 className="fw-bold mb-1">Patient Directory</h5>
                <p className="text-secondary small mb-0">
                  Search and manage registered patient records.
                </p>
              </Col>

              <Col xs={12} lg={5} xl={4}>
                <InputGroup className="patient-search">
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>

                  <Form.Control
                    aria-label="Search patients"
                    placeholder="Search name, contact, address or ID..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />

                  {search && (
                    <Button
                      variant="light"
                      title="Clear search"
                      onClick={() => setSearch("")}
                    >
                      <FaTimes />
                    </Button>
                  )}
                </InputGroup>
              </Col>
            </Row>
          </div>

          {error && (
            <Alert
              variant="warning"
              className="mx-3 mx-lg-4 mt-3 mb-0"
              dismissible
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}

          <div className="table-responsive patient-table-wrapper">
            <Table hover className="patient-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date of Birth</th>
                  <th>Gender</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <Spinner animation="border" variant="success" />
                      <p className="text-secondary mt-3 mb-0">
                        Loading patient records...
                      </p>
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <div className="patient-empty-icon mx-auto mb-3">
                        <FaUserInjured size={28} />
                      </div>

                      <h6 className="fw-bold">
                        {search.trim()
                          ? "No matching patients found"
                          : "No patients available"}
                      </h6>

                      <p className="text-secondary small mb-3">
                        {search.trim()
                          ? "Try another search term."
                          : "Add a patient to get started."}
                      </p>

                      {!search.trim() && (
                        <Button
                          className="patient-add-btn"
                          onClick={() => navigate("/add/patient")}
                        >
                          <FaUserPlus className="me-2" />
                          Add First Patient
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient._id}>
                      {/* Patient */}
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="patient-avatar">
                            <FaUserInjured size={18} />
                          </div>

                          <div className="patient-name-cell">
                            <div className="fw-semibold text-dark">
                              {`${patient.firstName || ""} ${
                                patient.lastName || ""
                              }`.trim() || "Unknown Patient"}
                            </div>

                            <small className="text-secondary">
                              {patient.patientCode
                                ? `ID: ${patient.patientCode}`
                                : "Patient record"}
                            </small>
                          </div>
                        </div>
                      </td>

                      {/* Date of birth */}
                      <td>
                        <span className="patient-detail">
                          <FaCalendarAlt />
                          {formatDate(patient.dateOfBirth)}
                        </span>
                      </td>

                      {/* Gender */}
                      <td>{getGenderBadge(patient.gender)}</td>

                      {/* Contact */}
                      <td>
                        <span className="patient-detail">
                          <FaPhone />
                          {patient.contactNumber || "—"}
                        </span>
                      </td>

                      {/* Address */}
                      <td>
                        <span className="patient-detail patient-address">
                          <FaMapMarkerAlt />
                          <span>{patient.address || "—"}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      {/* Actions */}
                      <td>
                        <div className="d-flex justify-content-center align-items-center gap-2">
                          {/* Create Consultation */}
                          <Button
                            variant="light"
                            className="patient-action-btn patient-consultation-btn"
                            title="Create Consultation"
                            aria-label={`Create consultation for ${patient.firstName}`}
                            onClick={() =>
                              navigate(`/createConsultations/${patient._id}`)
                            }
                          >
                            <FaPlus />
                          </Button>

                          {/* Edit Patient */}
                          <Button
                            variant="light"
                            className="patient-action-btn patient-edit-btn"
                            title="Edit Patient"
                            aria-label={`Edit patient ${patient.firstName}`}
                            onClick={() =>
                              navigate(`/edit/patient/${patient._id}`)
                            }
                          >
                            <FaEdit />
                          </Button>

                          {/* Delete Patient */}
                          <Button
                            variant="light"
                            className="patient-action-btn patient-delete-btn"
                            title="Delete Patient"
                            aria-label={`Delete patient ${patient.firstName}`}
                            disabled={deletingId === patient._id}
                            onClick={() => setPatientToDelete(patient)}
                          >
                            {deletingId === patient._id ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <FaTrash />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* Footer */}
          {!loading && filteredPatients.length > 0 && (
            <div className="patient-directory-footer px-3 px-lg-4 py-3">
              <span className="text-secondary small">
                Showing <strong>{filteredPatients.length}</strong> of{" "}
                <strong>{patients.length}</strong> patients
              </span>

              <Badge
                bg="light"
                text="dark"
                className="border rounded-pill px-3 py-2"
              >
                <FaUsers className="me-2 text-success" />
                Patient Records
              </Badge>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Delete confirmation */}
      <Modal
        show={Boolean(patientToDelete)}
        onHide={() => {
          if (deletingId === null) setPatientToDelete(null);
        }}
        centered
        backdrop={deletingId !== null ? "static" : true}
      >
        <Modal.Header closeButton={deletingId === null}>
          <Modal.Title className="fw-bold">Delete Patient</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="d-flex gap-3 align-items-start">
            <div className="delete-warning-icon">
              <FaTrash size={20} />
            </div>

            <div>
              <p className="mb-2">
                Are you sure you want to delete{" "}
                <strong>
                  {patientToDelete
                    ? `${patientToDelete.firstName || ""} ${
                        patientToDelete.lastName || ""
                      }`.trim()
                    : ""}
                </strong>
                ?
              </p>

              <p className="text-secondary small mb-0">
                This action cannot be undone unless your backend supports
                recovery.
              </p>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="light"
            className="border"
            onClick={() => setPatientToDelete(null)}
            disabled={deletingId !== null}
          >
            Cancel
          </Button>

          <Button
            variant="danger"
            onClick={deletePatient}
            disabled={deletingId !== null}
          >
            {deletingId !== null ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              <>
                <FaTrash className="me-2" />
                Delete Patient
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Page-specific styling */}
      <style>{`
        .patient-page {
          min-height: 100%;
          background: #f7f9fc;
          color: #1f2937;
        }

        .patient-page-title {
          font-size: clamp(1.45rem, 2vw, 1.9rem);
          letter-spacing: -0.6px;
          color: #172b4d;
        }

        .patient-heading-icon {
          width: 54px;
          height: 54px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          color: #157347;
          background: #dff5e8;
        }

        .patient-add-btn {
          border: 1px solid #198754;
          border-radius: 10px;
          background: #198754;
          color: white;
          padding: 10px 18px;
          font-weight: 600;
          box-shadow: 0 3px 8px rgba(25, 135, 84, 0.12);
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .patient-add-btn:hover,
        .patient-add-btn:focus {
          background: #146c43;
          border-color: #146c43;
          color: white;
          transform: translateY(-1px);
        }

        .patient-refresh-btn {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #475569;
        }

        .patient-stat-card {
          border: 1px solid #edf0f5;
          border-radius: 16px;
          background: white;
          box-shadow: 0 3px 14px rgba(15, 23, 42, 0.035);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .patient-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
        }

        .patient-stat-icon {
          width: 52px;
          height: 52px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #e8f0ff;
          color: #3164c8;
        }

        .patient-stat-icon-green {
          color: #198754;
          background: #e1f5e9;
        }

        .patient-stat-icon-purple {
          color: #7655c9;
          background: #f0eaff;
        }

        .patient-directory-card {
          overflow: hidden;
          border-radius: 16px;
          background: white;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.045);
        }

        .patient-directory-header {
          border-bottom: 1px solid #edf0f5;
        }

        .patient-search .input-group-text,
        .patient-search .form-control,
        .patient-search .btn {
          min-height: 44px;
          border-color: #e2e8f0;
          background: #fff;
        }

        .patient-search .input-group-text {
          padding-left: 14px;
          color: #64748b;
          border-radius: 10px 0 0 10px;
          border-right: 0;
        }

        .patient-search .form-control {
          box-shadow: none;
          border-left: 0;
          font-size: 0.9rem;
        }

        .patient-search .form-control:focus {
          border-color: #86b7a0;
        }

        .patient-search .btn {
          border-radius: 0 10px 10px 0;
        }

        .patient-table-wrapper {
          min-height: 220px;
        }

        .patient-table {
          white-space: nowrap;
        }

        .patient-table thead th {
          padding: 15px 18px;
          background: #f8fafc;
          color: #64748b;
          border-bottom: 1px solid #e8edf3;
          font-size: 0.76rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.45px;
        }

        .patient-table tbody td {
          padding: 16px 18px;
          border-color: #f0f2f6;
          font-size: 0.88rem;
          vertical-align: middle;
        }

        .patient-table tbody tr {
          transition: background 0.15s ease;
        }

        .patient-table tbody tr:hover > * {
          background: #f8fcf9;
        }

        .patient-avatar {
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          color: #198754;
          background: #e2f5e9;
        }

        .patient-name-cell {
          white-space: normal;
          min-width: 140px;
        }

        .patient-detail {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #475569;
        }

        .patient-detail > svg {
          flex-shrink: 0;
          color: #94a3b8;
        }

        .patient-address {
          max-width: 240px;
          white-space: normal;
          line-height: 1.5;
        }

        .patient-action-btn {
          width: 35px;
          height: 35px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          border-radius: 9px;
          transition: all 0.2s ease;
        }

        .patient-edit-btn {
          color: #946200;
          background: #fff5d9;
          border-color: #ffebad;
        }

        .patient-edit-btn:hover {
          color: #fff;
          background: #d99a00;
          border-color: #d99a00;
        }

        .patient-delete-btn {
          color: #c0394b;
          background: #fff0f1;
          border-color: #ffdadd;
        }

        .patient-delete-btn:hover {
          color: white;
          background: #dc3545;
          border-color: #dc3545;
        }

        .patient-empty-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          color: #64748b;
          background: #f1f5f9;
        }

        .patient-directory-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          border-top: 1px solid #edf0f5;
        }

        .delete-warning-icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          color: #dc3545;
          background: #fff0f1;
        }

        @media (max-width: 576px) {
          .patient-page {
            padding-top: 20px !important;
          }

          .patient-heading-icon {
            width: 46px;
            height: 46px;
            border-radius: 13px;
          }

          .patient-add-btn {
            padding: 9px 13px;
          }

          .patient-directory-footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </Container>
  );
}

export default PatientList;
