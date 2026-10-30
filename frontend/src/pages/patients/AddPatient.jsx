import "bootstrap/dist/css/bootstrap.min.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  addPatientLocally,
  savePatientsLocally,
} from "../../db/patientStorage";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  InputGroup,
} from "react-bootstrap";

import {
  FaUserPlus,
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

const AddPatient = () => {
  const navigate = useNavigate();

  const [patient, setPatient] = useState({ ...initialPatient });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setLoading(true);
      setError("");

      const patientData = {
        ...patient,
        firstName: patient.firstName.trim(),
        lastName: patient.lastName.trim(),
        gender: patient.gender || "undisclosed",
        dateOfBirth: patient.dateOfBirth || null,
        contactNumber: patient.contactNumber.trim(),
        address: patient.address.trim(),
      };

      try {
        // First, try saving the patient to the backend.
        const response = await axios.post(
          `${apiUrl}/add/patient`,
          patientData,
          {
            withCredentials: true,
            timeout: 10000,
          },
        );

        // Extract the created patient from the API response.
        const responseData = response.data;

        const savedPatient =
          responseData.patient ??
          responseData.data?.patient ??
          responseData.data;

        // Save the server-generated patient record locally.
        if (savedPatient?._id) {
          await savePatientsLocally([savedPatient]);
        }

        alert(responseData.message || "Patient added successfully!");

        setPatient({ ...initialPatient });
        navigate("/patients");
      } catch (apiError) {
        // If the backend is unavailable, save locally.
        if (!apiError.response) {
          const localPatient = await addPatientLocally(patientData);

          console.log("Patient saved locally:", localPatient);

          alert(
            "Internet unavailable. Patient saved locally and is pending synchronization.",
          );

          setPatient({ ...initialPatient });
          navigate("/patients");
          return;
        }

        // The backend responded with an error, such as validation failure.
        throw apiError;
      }
    } catch (err) {
      console.error("Error adding patient:", err);
      console.error("Response data:", err.response?.data);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to add patient. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPatient({ ...initialPatient });
    setError("");
  };

  return (
    <Container fluid className="bg-light min-vh-100 p-3 p-md-4">
      {/* Page Header */}
      <Row className="align-items-center mb-4 g-3">
        <Col>
          <div className="d-flex align-items-center gap-3">
            <div
              className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center"
              style={{ width: "52px", height: "52px" }}
            >
              <FaUserPlus size={23} />
            </div>

            <div>
              <h3 className="fw-bold text-dark mb-1">Add Patient</h3>
              <p className="text-secondary mb-0 small">
                Register a patient in the hospital
              </p>
            </div>
          </div>
        </Col>

        <Col xs={12} md="auto">
          <Button
            variant="outline-secondary"
            className="rounded-3 px-4"
            onClick={() => navigate("/patients")}
            disabled={loading}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Patients
          </Button>
        </Col>
      </Row>

      {/* Patient Form */}
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
                    Please fill in the patient's details below
                  </p>
                </div>
              </div>
            </Card.Header>

            <Card.Body className="p-3 p-md-4">
              <Form onSubmit={handleSubmit}>
                {/* Error Message */}
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                {/* Personal Information */}
                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3">
                    <FaUser className="me-2" />
                    Personal Information
                  </h6>

                  <Row className="g-3">
                    {/* First Name */}
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
                            disabled={loading}
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    {/* Last Name */}
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
                            disabled={loading}
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    {/* Date of Birth */}
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
                            disabled={loading}
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    {/* Gender */}
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
                            disabled={loading}
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

                {/* Contact Information */}
                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3">
                    <FaPhone className="me-2" />
                    Contact Information
                  </h6>

                  <Row className="g-3">
                    {/* Contact Number */}
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
                            disabled={loading}
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>

                    {/* Address */}
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
                          disabled={loading}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                <hr className="my-4" />

                {/* Form Buttons */}
                <div className="d-flex justify-content-end flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    className="rounded-3 px-4"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-counterclockwise me-2"></i>
                    Reset
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    className="rounded-3 px-4 fw-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaUserPlus className="me-2" />
                        Add Patient
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

export default AddPatient;
