import "bootstrap/dist/css/bootstrap.min.css";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  InputGroup,
  Modal,
  Spinner,
} from "react-bootstrap";

import { FaEnvelope, FaLock, FaUserCircle, FaArrowRight } from "react-icons/fa";

import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const apiUrl = import.meta.env.VITE_API_URL;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setModalTitle("Validation Error");
      setModalMessage("Please enter email and password.");
      setIsSuccess(false);
      setShowModal(true);
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${apiUrl}/login`,
        {
          email: email.trim(),
          password,
        },
        {
          withCredentials: true,
        },
      );

      setModalTitle("Login Successful");
      setModalMessage(
        response.data.message || "Welcome! You have logged in successfully.",
      );

      setIsSuccess(true);
      setShowModal(true);

      // Do not store the JWT in localStorage.
      // The browser manages the HTTP-only cookie.

      // Save user details if the backend returns them.
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
    } catch (error) {
      setModalTitle("Login Failed");
      setModalMessage(
        error.response?.data?.message ||
          "Invalid email or password. Please try again.",
      );

      setIsSuccess(false);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);

    if (isSuccess) {
      navigate("/dashboardlayout");
    }
  };

  return (
    <>
      <Container
        fluid
        className="min-vh-100 bg-light d-flex align-items-center justify-content-center p-3"
      >
        <Row
          className="w-100 shadow-lg rounded-4 overflow-hidden bg-white"
          style={{
            maxWidth: "750px",
            minHeight: "420px",
            border: "1px solid #e9ecef",
          }}
        >
          {/* Left Side */}
          <Col
            md={6}
            className="text-white d-flex flex-column justify-content-center align-items-center text-center p-4"
            style={{
              background: "linear-gradient(145deg,  #0f766e, #0891b2)",
            }}
          >
            <div
              className="rounded-circle d-flex align-items-center justify-content-center mb-3"
              style={{
                width: "75px",
                height: "75px",
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              <FaUserCircle size={43} />
            </div>

            <h2 className="fw-bold mb-2">Welcome Back!</h2>

            <p className="mb-4" style={{ fontSize: "14px", lineHeight: "1.7" }}>
              Manage your account easily and securely. Login to continue your
              journey with us.
            </p>

            <div
              className="rounded-pill px-3 py-2"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.35)",
              }}
            >
              <i className="bi bi-shield-check me-2"></i>
              <span className="fw-semibold small">Secure Login Portal</span>
            </div>
          </Col>

          {/* Right Side */}
          <Col md={6} className="d-flex flex-column justify-content-center p-4">
            <div className="text-center mb-3">
              <h3 className="fw-bold mb-1" style={{ color: " #0891b2" }}>
                Login
              </h3>
              <p className="text-secondary small mb-0">
                Enter your credentials to access your account
              </p>
            </div>

            <Form onSubmit={handleLogin}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small mb-1">
                  Email Address
                </Form.Label>

                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light text-primary border-end-0">
                    <FaEnvelope style={{ color: " #0891b2" }} />
                  </InputGroup.Text>

                  <Form.Control
                    className="bg-light border-start-0 shadow-none"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label className="fw-semibold small mb-1">
                  Password
                </Form.Label>

                <InputGroup size="sm">
                  <InputGroup.Text className="bg-light border-end-0">
                    <FaLock style={{ color: "#0891b2" }} />
                  </InputGroup.Text>

                  <Form.Control
                    className="bg-light border-start-0 border-end-0 shadow-none"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <InputGroup.Text
                    className="bg-light"
                    style={{ cursor: "pointer" }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </InputGroup.Text>
                </InputGroup>
              </Form.Group>

              <div className="text-end mb-3">
                <Link
                  to="/"
                  className="text-primary text-decoration-none small fw-semibold"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                size="sm"
                className="w-100 rounded-2 fw-bold py-2 shadow-sm"
                disabled={loading}
                style={{
                  background: "linear-gradient(145deg,  #0f766e, #0891b2)",
                }}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" animation="border" className="me-2" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Login <FaArrowRight className="ms-2" />
                  </>
                )}
              </Button>
            </Form>

            <div className="text-center mt-3">
              <span className="text-secondary small">
                Don't have an account?
              </span>

              <Link
                to="/register"
                className="text-primary text-decoration-none fw-bold small ms-2"
              >
                Sign Up
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
      </Container>

      {/* Login Response Modal */}
      {/* Login Response Modal */}
      <Modal
        show={showModal}
        onHide={handleModalClose}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-0" />

        <Modal.Body className="text-center px-4 pt-2 pb-4">
          {/* Success / Error Icon */}
          <div
            className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
            style={{
              width: "75px",
              height: "75px",
              background: isSuccess ? "#d1fae5" : "#fee2e2",
            }}
          >
            <i
              className={`bi ${
                isSuccess ? "bi-check-circle-fill" : "bi-x-circle-fill"
              }`}
              style={{
                fontSize: "42px",
                color: isSuccess ? "#059669" : "#dc2626",
              }}
            ></i>
          </div>

          {/* Title */}
          <h4
            className="fw-bold mb-2"
            style={{
              color: isSuccess ? "#059669" : "#dc2626",
            }}
          >
            {modalTitle}
          </h4>

          {/* Message */}
          <p className="text-secondary mb-4" style={{ fontSize: "14px" }}>
            {modalMessage}
          </p>

          {/* Button */}
          <Button
            onClick={handleModalClose}
            className="rounded-pill px-5 py-2 fw-semibold border-0 shadow-sm"
            style={{
              background: "linear-gradient(145deg, #0f766e, #0891b2)",
            }}
          >
            Continue <i className="bi bi-arrow-right ms-2"></i>
          </Button>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default Login;
