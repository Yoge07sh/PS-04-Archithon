import "bootstrap/dist/css/bootstrap.min.css";
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
          style={{ maxWidth: "950px" }}
        >
          {/* Left Side */}
          <Col
            md={6}
            className="bg-primary text-white d-flex flex-column justify-content-center align-items-center text-center p-5"
          >
            <FaUserCircle size={85} className="mb-4" />

            <h1 className="fw-bold mb-3">Welcome Back!</h1>

            <p className="fs-5 mb-4">
              Manage your account easily and securely. Login to continue your
              journey with us.
            </p>

            <div className="border border-white rounded-pill px-4 py-2">
              <span className="fw-semibold">Secure Login Portal</span>
            </div>
          </Col>

          {/* Right Side */}
          <Col md={6} className="p-4 p-lg-5">
            <div className="text-center mb-4">
              <h2 className="fw-bold text-primary">Login</h2>

              <p className="text-secondary">
                Enter your credentials to access your account
              </p>
            </div>

            <Form onSubmit={handleLogin}>
              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">Email Address</Form.Label>

                <InputGroup size="lg">
                  <InputGroup.Text className="bg-light text-primary">
                    <FaEnvelope />
                  </InputGroup.Text>

                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Password</Form.Label>

                <InputGroup size="lg">
                  <InputGroup.Text className="bg-light text-primary">
                    <FaLock />
                  </InputGroup.Text>

                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </InputGroup>
              </Form.Group>

              <div className="text-end mb-4">
                <Link
                  to="/forgot-password"
                  className="text-primary text-decoration-none fw-semibold"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-100 rounded-3 fw-bold"
                disabled={loading}
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

            <div className="text-center mt-4">
              <span className="text-secondary">Don't have an account?</span>

              <Link
                to="/register"
                className="text-primary text-decoration-none fw-bold ms-2"
              >
                Sign Up
              </Link>
            </div>

            <hr className="my-4" />

            <p className="text-center text-secondary small mb-0">
              © 2026 All Rights Reserved
            </p>
          </Col>
        </Row>
      </Container>

      {/* Login Response Modal */}
      <Modal show={showModal} onHide={handleModalClose} centered>
        <Modal.Header closeButton>
          <Modal.Title className={isSuccess ? "text-success" : "text-danger"}>
            {modalTitle}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="text-center py-4">{modalMessage}</Modal.Body>

        <Modal.Footer>
          <Button
            variant={isSuccess ? "success" : "primary"}
            onClick={handleModalClose}
          >
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Login;
