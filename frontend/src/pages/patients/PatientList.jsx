import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
} from "react-icons/fa";

const apiUrl = import.meta.env.VITE_API_URL;

function PatientList() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [patientToDelete, setPatientToDelete] = useState(null);

  // Fetch patients
  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${apiUrl}/patients`, {
        withCredentials: true,
      });

      const patientData = Array.isArray(response.data)
        ? response.data
        : (response.data.patients ?? response.data.data);

      if (!Array.isArray(patientData)) {
        throw new Error("Invalid patient data received from server.");
      }

      setPatients(patientData);
    } catch (err) {
      console.error("Error fetching patients:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load patients. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Frontend search
  const filteredPatients = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) return patients;

    return patients.filter((patient) => {
      const fullName = `${patient.firstName || ""} ${
        patient.lastName || ""
      }`.toLowerCase();

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

  // Format date of birth
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

  // Gender badge
  const getGenderBadge = (gender) => {
    const normalizedGender = (gender || "undisclosed").toLowerCase();

    const variants = {
      male: "primary",
      female: "danger",
      other: "info",
      undisclosed: "secondary",
    };

    return (
      <Badge
        bg={variants[normalizedGender] || "secondary"}
        className="px-3 py-2 rounded-pill text-capitalize"
      >
        {normalizedGender}
      </Badge>
    );
  };

  // Delete patient
  const deletePatient = async () => {
    if (!patientToDelete?._id) return;

    try {
      setDeletingId(patientToDelete._id);
      setError("");

      const response = await axios.delete(
        `${apiUrl}/delete-patient/${patientToDelete._id}`,
        {
          withCredentials: true,
        },
      );

      setPatients((prev) =>
        prev.filter((patient) => patient._id !== patientToDelete._id),
      );

      alert(response.data.message || "Patient deleted successfully.");
      setPatientToDelete(null);
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
      {/* Page Header */}
      <Row className="align-items-center mb-4 g-3">
        <Col>
          <div className="d-flex align-items-center gap-3">
            <div className="patient-header-icon">
              <FaUsers size={24} />
            </div>

            <div>
              <h2 className="fw-bold mb-1">Patient List</h2>
              <p className="text-secondary mb-0">
                View and manage registered patients
              </p>
            </div>
          </div>
        </Col>

        <Col xs={12} md="auto">
          <Button
            className="bg-success-subtle text-success border border-success rounded-3 px-4 py-2 fw-semibold"
            onClick={() => navigate("/add/patient")}
          >
            <FaUserPlus className="me-2" />
            Add Patient +
          </Button>
        </Col>
      </Row>

      {/* Patient Table */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Body className="p-3 p-md-4">
          <Row className="align-items-center mb-4 g-3">
            <Col>
              <h5 className="fw-bold mb-1">Patient Directory</h5>
              <p className="text-secondary small mb-0">
                Patient information and contact details
              </p>
            </Col>

            {/* Search */}
            <Col xs={12} md={5} lg={4}>
              <InputGroup>
                <InputGroup.Text className="bg-white border-end-0">
                  <FaSearch className="text-secondary" />
                </InputGroup.Text>

                <Form.Control
                  className="border-start-0 ps-0 shadow-none"
                  placeholder="Search name, contact, address or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                {search && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => setSearch("")}
                  >
                    Clear
                  </Button>
                )}
              </InputGroup>
            </Col>
          </Row>

          {/* Error */}
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {/* Table */}
          <div className="table-responsive">
            <Table hover className="align-middle patient-table mb-0">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Date of Birth</th>
                  <th>Gender</th>
                  <th>Contact</th>
                  <th>Address</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                      <p className="text-secondary mt-3 mb-0">
                        Loading patients...
                      </p>
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-5">
                      <FaUserInjured
                        size={35}
                        className="text-secondary mb-3"
                      />

                      <h6 className="fw-semibold">
                        {search.trim()
                          ? "No matching patients found"
                          : "No patients available"}
                      </h6>

                      <p className="text-secondary small mb-0">
                        {search.trim()
                          ? "Try another name, contact number, address or patient ID."
                          : "Registered patients will appear here."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient._id}>
                      {/* Patient Name */}
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="patient-avatar">
                            <FaUserInjured size={17} />
                          </div>

                          <div>
                            <div className="fw-semibold text-dark">
                              {`${patient.firstName || ""} ${
                                patient.lastName || ""
                              }`.trim() || "Unknown Patient"}
                            </div>

                            {patient.patientCode && (
                              <small className="text-secondary">
                                ID: {patient.patientCode}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date of Birth */}
                      <td>
                        <span className="text-nowrap">
                          <FaCalendarAlt className="text-secondary me-2" />
                          {formatDate(patient.dateOfBirth)}
                        </span>
                      </td>

                      {/* Gender */}
                      <td>{getGenderBadge(patient.gender)}</td>

                      {/* Contact */}
                      <td>
                        <span className="text-nowrap">
                          <FaPhone className="text-secondary me-2" />
                          {patient.contactNumber || "—"}
                        </span>
                      </td>

                      {/* Address */}
                      <td>
                        <div className="patient-address">
                          <FaMapMarkerAlt className="text-secondary me-2 flex-shrink-0" />
                          <span>{patient.address || "—"}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="warning"
                            size="sm"
                            title="Edit Patient"
                            onClick={() =>
                              navigate(`/edit/patient/${patient._id}`)
                            }
                          >
                            <FaEdit />
                          </Button>

                          <Button
                            variant="danger"
                            size="sm"
                            title="Delete Patient"
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

          {/* Record Count */}
          {!loading && filteredPatients.length > 0 && (
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3 pt-3 border-top">
              <small className="text-secondary">
                Showing {filteredPatients.length} of {patients.length} patients
              </small>

              <small className="text-secondary">
                <FaVenusMars className="me-1" />
                Patient Records
              </small>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        show={Boolean(patientToDelete)}
        onHide={() => setPatientToDelete(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Patient</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          Are you sure you want to delete{" "}
          <strong>
            {patientToDelete
              ? `${patientToDelete.firstName || ""} ${
                  patientToDelete.lastName || ""
                }`.trim()
              : ""}
          </strong>
          ? This action cannot be undone unless your backend supports recovery.
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
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
            {deletingId !== null ? "Deleting..." : "Delete Patient"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default PatientList;
