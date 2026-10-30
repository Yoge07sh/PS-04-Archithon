import "bootstrap/dist/css/bootstrap.min.css";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  savePatientsLocally,
  getLocalPatients,
  updatePatientLocally,
} from "../../db/patientStorage";
import { db } from "../../db/localDB";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  InputGroup,
  Spinner,
} from "react-bootstrap";

import {
  FaUserEdit,
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaVenusMars,
} from "react-icons/fa";

const apiUrl = import.meta.env.VITE_API_URL;

const initialPatient = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  contactNumber: "",
  address: "",
};

const EditPatient = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [patient, setPatient] = useState({ ...initialPatient });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        setError("");

        try {
          const response = await axios.get(
            `${apiUrl}/get/patientforEdit/${id}`,
            {
              withCredentials: true,
              timeout: 10000,
            },
          );

          const data =
            response.data?.patient ??
            response.data?.data?.patient ??
            response.data?.data ??
            response.data;

          if (!data?._id) {
            throw new Error("Patient details were not returned by the server.");
          }

          await savePatientsLocally([
            {
              ...data,
              _id: String(data._id),
            },
          ]);

          setPatient({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            dateOfBirth: data.dateOfBirth
              ? String(data.dateOfBirth).slice(0, 10)
              : "",
            gender: data.gender || "undisclosed",
            contactNumber: data.contactNumber || "",
            address: data.address || "",
          });
        } catch (networkError) {
          if (networkError.response) {
            throw networkError;
          }

          const localPatient = await db.patients.get(String(id));

          if (!localPatient) {
            throw new Error(
              "Patient is not available offline. Connect to the internet and try again.",
            );
          }

          setPatient({
            firstName: localPatient.firstName || "",
            lastName: localPatient.lastName || "",
            dateOfBirth: localPatient.dateOfBirth
              ? String(localPatient.dateOfBirth).slice(0, 10)
              : "",
            gender: localPatient.gender || "undisclosed",
            contactNumber: localPatient.contactNumber || "",
            address: localPatient.address || "",
          });

          setError(
            "You are offline. Changes will be saved locally and synchronized when the internet returns.",
          );
        }
      } catch (err) {
        console.error("Error fetching patient:", err);

        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to fetch patient details.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPatient(); // This call was missing!
    } else {
      setError("Patient ID is missing.");
      setLoading(false);
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setPatient((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setUpdating(true);
      setError("");

      const patientData = {
        firstName: patient.firstName.trim(),
        lastName: patient.lastName.trim(),
        dateOfBirth: patient.dateOfBirth || undefined,
        gender: patient.gender || "undisclosed",
        contactNumber: patient.contactNumber.trim(),
        address: patient.address.trim(),
      };

      try {
        // Attempt to update the patient on the server.
        const response = await axios.put(
          `${apiUrl}/edit/patient/${id}`,
          patientData,
          {
            withCredentials: true,
            timeout: 10000,
          },
        );

        const serverPatient =
          response.data.patient || response.data.data?.patient;

        // Keep IndexedDB updated with the server's saved version.
        const existingPatient = await db.patients.get(String(id));

        await savePatientsLocally([
          {
            ...(existingPatient || {}),
            ...(serverPatient || {}),
            ...patientData,
            _id: String(serverPatient?._id || id),
            syncStatus: "synced",
          },
        ]);

        alert(response.data.message || "Patient updated successfully!");
        navigate("/patientList");
      } catch (requestError) {
        // If the server responded, this is an HTTP/API error,
        // not an offline network failure.
        if (requestError.response) {
          throw requestError;
        }

        // Network failure: save the edit in IndexedDB.
        await updatePatientLocally(String(id), patientData);

        alert(
          "Internet unavailable. Changes saved locally and will synchronize when you reconnect.",
        );

        navigate("/patients");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to update patient. Please try again.",
      );
    } finally {
      setUpdating(false);
    }
  };
  if (loading) {
    return (
      <Container fluid className="bg-light min-vh-100 p-4">
        <div className="d-flex justify-content-center align-items-center min-vh-50">
          <Spinner animation="border" variant="primary" />
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="bg-light min-vh-100 p-3 p-md-4">
      <Row className="align-items-center mb-4 g-3">
        <Col>
          <div className="d-flex align-items-center gap-3">
            <div
              className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center"
              style={{ width: "52px", height: "52px" }}
            >
              <FaUserEdit size={23} />
            </div>

            <div>
              <h3 className="fw-bold text-dark mb-1">Edit Patient</h3>
              <p className="text-secondary mb-0 small">
                Update patient information
              </p>
            </div>
          </div>
        </Col>

        <Col xs={12} md="auto">
          <Button
            variant="outline-secondary"
            className="rounded-3 px-4"
            onClick={() => navigate("/patients")}
            disabled={updating}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Patients
          </Button>
        </Col>
      </Row>

      <Row className="justify-content-center">
        <Col xs={12}>
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white border-0 p-3 p-md-4">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-primary-subtle text-primary rounded-3 p-3">
                  <FaUser size={22} />
                </div>

                <div>
                  <h5 className="fw-bold mb-1">Patient Information</h5>
                  <p className="text-secondary small mb-0">
                    Update the patient's details below
                  </p>
                </div>
              </div>
            </Card.Header>

            <Card.Body className="p-3 p-md-4">
              <Form onSubmit={handleSubmit}>
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3">
                    <FaUser className="me-2" />
                    Personal Information
                  </h6>

                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          First Name <span className="text-danger">*</span>
                        </Form.Label>

                        <InputGroup>
                          <InputGroup.Text className="bg-light">
                            <FaUser className="text-secondary" />
                          </InputGroup.Text>

                          <Form.Control
                            type="text"
                            name="firstName"
                            placeholder="Enter first name"
                            value={patient.firstName}
                            onChange={handleChange}
                            required
                            maxLength={100}
                            disabled={updating}
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Last Name <span className="text-danger">*</span>
                        </Form.Label>

                        <InputGroup>
                          <InputGroup.Text className="bg-light">
                            <FaUser className="text-secondary" />
                          </InputGroup.Text>

                          <Form.Control
                            type="text"
                            name="lastName"
                            placeholder="Enter last name"
                            value={patient.lastName}
                            onChange={handleChange}
                            required
                            maxLength={100}
                            disabled={updating}
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Date of Birth
                        </Form.Label>

                        <InputGroup>
                          <InputGroup.Text className="bg-light">
                            <FaCalendarAlt className="text-secondary" />
                          </InputGroup.Text>

                          <Form.Control
                            type="date"
                            name="dateOfBirth"
                            value={patient.dateOfBirth}
                            onChange={handleChange}
                            max={new Date().toISOString().split("T")[0]}
                            disabled={updating}
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Gender
                        </Form.Label>

                        <InputGroup>
                          <InputGroup.Text className="bg-light">
                            <FaVenusMars className="text-secondary" />
                          </InputGroup.Text>

                          <Form.Select
                            name="gender"
                            value={patient.gender}
                            onChange={handleChange}
                            disabled={updating}
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="undisclosed">Undisclosed</option>
                          </Form.Select>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                <hr className="my-4" />

                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3">
                    <FaPhone className="me-2" />
                    Contact Information
                  </h6>

                  <Row className="g-3">
                    <Col xs={12} md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          Contact Number
                        </Form.Label>

                        <InputGroup>
                          <InputGroup.Text className="bg-light">
                            <FaPhone className="text-secondary" />
                          </InputGroup.Text>

                          <Form.Control
                            type="tel"
                            name="contactNumber"
                            placeholder="Enter phone number"
                            value={patient.contactNumber}
                            onChange={handleChange}
                            maxLength={20}
                            disabled={updating}
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">
                          <FaMapMarkerAlt className="text-primary me-2" />
                          Address
                        </Form.Label>

                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="address"
                          placeholder="Enter complete patient address"
                          value={patient.address}
                          onChange={handleChange}
                          maxLength={500}
                          disabled={updating}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                <hr className="my-4" />

                <div className="d-flex justify-content-end flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    className="rounded-3 px-4"
                    onClick={() => navigate("/patientList")}
                    disabled={updating}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    className="rounded-3 px-4 fw-semibold"
                    disabled={updating}
                  >
                    {updating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <FaUserEdit className="me-2" />
                        Update Patient
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EditPatient;
