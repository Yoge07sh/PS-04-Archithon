import { useState } from "react";
import axios from "axios";

import {
  Container,
  Form,
  Button,
  Card,
  Row,
  Col,
  Modal,
  Spinner,
} from "react-bootstrap";

import { Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_URL;

function Register() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [modalType, setModalType] = useState("warning");

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Show Modal
  const handleModal = (title, message, type = "warning") => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // First Name Validation
    if (!/^[a-zA-Z ]+$/.test(formData.firstName.trim())) {
      handleModal("Invalid First Name", "Please enter a valid first name.");
      return;
    }

    // Last Name Validation
    if (!/^[a-zA-Z ]+$/.test(formData.lastName.trim())) {
      handleModal("Invalid Last Name", "Please enter a valid last name.");
      return;
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email.trim())) {
      handleModal("Invalid Email", "Please enter a valid email address.");
      return;
    }

    // Password Validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(formData.password)) {
      handleModal(
        "Weak Password",
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character.",
      );
      return;
    }

    // Confirm Password Validation
    if (formData.password !== formData.confirmPassword) {
      handleModal(
        "Password Mismatch",
        "Password and Confirm Password do not match.",
      );
      return;
    }

    // Role Validation
    if (!formData.role) {
      handleModal("Role Required", "Please select Doctor or Nurse.");
      return;
    }

    try {
      setLoading(true);

      // Remove Confirm Password from API Data
      const { confirmPassword, ...registerData } = formData;

      // Axios POST Request
      const response = await axios.post(`${apiUrl}/register`, registerData);

      // Success Modal
      handleModal(
        "Registration Successful",
        response.data.message || "Your account has been created successfully!",
        "success",
      );

      // Reset Form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "",
      });

      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      handleModal(
        "Registration Failed",
        error.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      fluid
      className="min-vh-100 d-flex justify-content-center align-items-center py-2"
      style={{
        background: "linear-gradient(135deg, #e0f2fe, #eef2ff)",
      }}
    >
      <Card
        className="border-0 shadow-lg w-100"
        style={{
          maxWidth: "650px",
          borderRadius: "18px",
        }}
      >
        <Card.Body className="px-4 py-3 px-md-5">
          {/* Heading */}
          <div className="text-center mb-3">
            <div
              className="d-inline-flex justify-content-center align-items-center mb-2"
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "#e0e7ff",
                color: "#4338ca",
                fontSize: "24px",
              }}
            >
              <i className="bi bi-person-plus-fill"></i>
            </div>

            <h3 className="fw-bold mb-1" style={{ color: "#1e293b" }}>
              Create Account
            </h3>

            <p className="text-muted mb-0">Register as a Doctor or Nurse</p>
          </div>

          <Form onSubmit={handleSubmit}>
            {/* First Name and Last Name */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label className="fw-semibold mb-1">
                    First Name
                  </Form.Label>

                  <Form.Control
                    type="text"
                    name="firstName"
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="py-2"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-2">
                  <Form.Label className="fw-semibold mb-1">
                    Last Name
                  </Form.Label>

                  <Form.Control
                    type="text"
                    name="lastName"
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="py-2"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Email */}
            <Form.Group className="mb-2">
              <Form.Label className="fw-semibold mb-1">
                Email Address
              </Form.Label>

              <Form.Control
                type="email"
                name="email"
                placeholder="example@gmail.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="py-2"
              />
            </Form.Group>

            {/* Password */}
            <Form.Group className="mb-2">
              <Form.Label className="fw-semibold mb-1">Password</Form.Label>

              <div className="position-relative">
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="py-2 pe-5"
                />

                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="position-absolute top-50 end-0 translate-middle-y me-3"
                  style={{
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </span>
              </div>

              <Form.Text className="text-muted">
                Min 8 characters, uppercase, lowercase, number and special
                character.
              </Form.Text>
            </Form.Group>

            {/* Confirm Password */}
            <Form.Group className="mb-2">
              <Form.Label className="fw-semibold mb-1">
                Confirm Password
              </Form.Label>

              <div className="position-relative">
                <Form.Control
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="py-2 pe-5"
                />

                <span
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="position-absolute top-50 end-0 translate-middle-y me-3"
                  style={{
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </span>
              </div>
            </Form.Group>

            {/* Role */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold mb-1">
                Select Your Role
              </Form.Label>

              <Form.Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="py-2"
              >
                <option value="">Select your role</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
              </Form.Select>
            </Form.Group>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-100 py-2 fw-semibold border-0"
              style={{
                background: "#4338ca",
                borderRadius: "8px",
              }}
            >
              {loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Registering...
                </>
              ) : (
                <>
                  <i className="bi bi-person-check-fill me-2"></i>
                  Create Account
                </>
              )}
            </Button>
          </Form>

          {/* Login Link */}
          <div className="text-center mt-3">
            <span className="text-muted">Already Registered? </span>

            <Link
              to="/login"
              className="fw-semibold text-decoration-none"
              style={{ color: "#4338ca" }}
            >
              Login Now
            </Link>
          </div>
        </Card.Body>
      </Card>

      {/* Warning / Success Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        backdrop="static"
      >
        <Modal.Header
          closeButton
          className={
            modalType === "success" ? "bg-success text-white" : "bg-warning"
          }
        >
          <Modal.Title className="fw-bold">{modalTitle}</Modal.Title>
        </Modal.Header>

        <Modal.Body className="text-center py-4">
          <i
            className={`bi ${
              modalType === "success"
                ? "bi-check-circle-fill text-success"
                : "bi-exclamation-triangle-fill text-warning"
            }`}
            style={{ fontSize: "45px" }}
          ></i>

          <p className="mt-3 mb-0">{modalMessage}</p>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant={modalType === "success" ? "success" : "warning"}
            onClick={() => setShowModal(false)}
          >
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Register;
