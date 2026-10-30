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
  InputGroup,
} from "react-bootstrap";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";

const apiUrl = import.meta.env.VITE_API_URL;

function Register() {
  const navigate = useNavigate();
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

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleModal = (title, message, type = "warning") => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/^[a-zA-Z ]+$/.test(formData.firstName.trim())) {
      handleModal("Invalid First Name", "Please enter a valid first name.");
      return;
    }

    if (!/^[a-zA-Z ]+$/.test(formData.lastName.trim())) {
      handleModal("Invalid Last Name", "Please enter a valid last name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email.trim())) {
      handleModal("Invalid Email", "Please enter a valid email address.");
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(formData.password)) {
      handleModal(
        "Weak Password",
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character.",
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      handleModal(
        "Password Mismatch",
        "Password and Confirm Password do not match.",
      );
      return;
    }

    if (!formData.role) {
      handleModal("Role Required", "Please select Doctor or Nurse.");
      return;
    }

    try {
      setLoading(true);

      const { confirmPassword, ...registerData } = formData;

      const response = await axios.post(`${apiUrl}/register`, registerData);

      handleModal(
        "Registration Successful",
        response.data.message || "Your account has been created successfully!",
        "success",
      );

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
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{ backgroundColor: "#f0f7f3" }}
    >
      <Card
        className="border-0 shadow-lg overflow-hidden w-100"
        style={{
          maxWidth: "1000px",
          borderRadius: "18px",
        }}
      >
        <Row className="g-0">
          {/* Left Welcome Panel */}
          <Col
            md={5}
            className="d-flex flex-column justify-content-center align-items-center text-center text-white p-4"
            style={{
              background: "linear-gradient(145deg,  #0f766e, #0891b2)",
            }}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center mb-3"
              style={{
                width: "75px",
                height: "75px",
                backgroundColor: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              <i className="bi bi-heart-pulse-fill fs-1"></i>
            </div>

            <h3 className="fw-bold mb-2">Join Our Team</h3>

            <p className="small mb-4" style={{ lineHeight: "1.8" }}>
              Create your account and become a part of our healthcare management
              platform.
            </p>

            <div
              className="rounded-pill px-3 py-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              <i className="bi bi-shield-check me-2"></i>
              <span className="small fw-semibold">Secure Registration</span>
            </div>

            <div className="mt-4 small text-white-50">
              <i className="bi bi-hospital me-2"></i>
              Medical AI Portal
            </div>
          </Col>

          {/* Right Registration Form */}
          <Col md={7} className="px-4 py-2">
            <div className="text-center mb-2">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                style={{
                  width: "38px",
                  height: "38px",
                  backgroundColor: "#e8f5e9",
                  color: "#15803d",
                }}
              >
                <i className="bi bi-person-plus-fill fs-5"></i>
              </div>

              <h3 className="fw-bold mb-1" style={{ color: "#166534" }}>
                Create Account
              </h3>

              <p className="text-secondary small mb-0">
                Register as a Doctor or Nurse
              </p>
            </div>

            <Form onSubmit={handleSubmit}>
              {/* First Name and Last Name */}
              <Row>
                <Col xs={6}>
                  <Form.Group className="mb-1">
                    <Form.Label className="fw-semibold small mb-1">
                      First Name
                    </Form.Label>

                    <Form.Control
                      size="sm"
                      type="text"
                      name="firstName"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="bg-light shadow-none"
                    />
                  </Form.Group>
                </Col>

                <Col xs={6}>
                  <Form.Group className="mb-1">
                    <Form.Label className="fw-semibold small mb-1">
                      Last Name
                    </Form.Label>

                    <Form.Control
                      size="sm"
                      type="text"
                      name="lastName"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="bg-light shadow-none"
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Email */}
              <Form.Group className="mb-1">
                <Form.Label className="fw-semibold small mb-1">
                  Email Address
                </Form.Label>

                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light text-success">
                    <i className="bi bi-envelope"></i>
                  </InputGroup.Text>

                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="example@gmail.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="bg-light shadow-none"
                  />
                </InputGroup>
              </Form.Group>

              {/* Password */}
              <Form.Group className="mb-1">
                <Form.Label className="fw-semibold small mb-1">
                  Password
                </Form.Label>

                <div className="position-relative">
                  <Form.Control
                    size="sm"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="bg-light pe-5 shadow-none"
                  />

                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="position-absolute top-50 end-0 translate-middle-y me-3"
                    style={{ cursor: "pointer", color: "#64748b" }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </span>
                </div>

                <Form.Text className="text-muted" style={{ fontSize: "10px" }}>
                  Minimum 8 characters with uppercase, lowercase, number and
                  special character.
                </Form.Text>
              </Form.Group>

              {/* Confirm Password */}
              <Form.Group className="mb-1">
                <Form.Label className="fw-semibold small mb-1">
                  Confirm Password
                </Form.Label>

                <div className="position-relative">
                  <Form.Control
                    size="sm"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="bg-light pe-5 shadow-none"
                  />

                  <span
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="position-absolute top-50 end-0 translate-middle-y me-3"
                    style={{ cursor: "pointer", color: "#64748b" }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </span>
                </div>
              </Form.Group>

              {/* Role */}
              <Form.Group className="mb-1">
                <Form.Label className="fw-semibold small mb-1">
                  Select Your Role
                </Form.Label>

                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light text-success">
                    <i className="bi bi-person-badge"></i>
                  </InputGroup.Text>

                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="bg-light shadow-none"
                  >
                    <option value="" className="mb-2">
                      Select your role
                    </option>
                    <option value="doctor" className="mb-2">
                      Doctor
                    </option>
                    <option value="nurse" className="mb-2">
                      {" "}
                      Nurse
                    </option>
                  </Form.Select>
                </InputGroup>
              </Form.Group>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-100 py-2 fw-semibold border-0 shadow-sm mt-1"
                style={{
                  background: "linear-gradient(145deg,  #0f766e, #0891b2)",
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

            <div className="text-center mt-3">
              <span className="text-secondary small">Already Registered?</span>

              <Link
                to="/login"
                className="text-decoration-none fw-bold small ms-2"
                style={{ color: "#15803d" }}
              >
                Login Now
              </Link>
            </div>

            <hr className="my-3" />

            <p
              className="text-center text-secondary mb-0"
              style={{ fontSize: "11px" }}
            >
              <i className="bi bi-shield-lock me-1"></i>© 2026 All Rights
              Reserved
            </p>
          </Col>
        </Row>
      </Card>

      {/* Registration Modal */}
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
            onClick={() => {
              setShowModal(false);

              if (modalType === "success") {
                navigate("/login");
              }
            }}
          >
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Register;
