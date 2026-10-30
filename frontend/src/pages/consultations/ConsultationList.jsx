
import "bootstrap/dist/css/bootstrap.min.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";

import {
  FaClipboardList,
  FaSearch,
  FaEye,
  FaSyncAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaWifi,
  FaPlus,
} from "react-icons/fa";

import { getAllLocalConsultations } from "../../db/consultationStorage";

const apiUrl = import.meta.env.VITE_API_URL;

const normalizeConsultation = (item, local = false) => ({
  ...item,

  id: item._id || item.serverId || item.id,

  patientId:
    typeof item.patientId === "object"
      ? item.patientId?._id
      : item.patientId,

  patientName:
    typeof item.patientId === "object"
      ? [
          item.patientId?.firstName,
          item.patientId?.lastName,
        ]
          .filter(Boolean)
          .join(" ") || "Patient"
      : item.patientName || "Patient",

  reviewStatus: item.reviewStatus || "pending",

  source: item.source || "manual",

  syncStatus: local
    ? item.syncStatus || "pending"
    : "synced",

  createdAt: item.createdAt,

  isLocal: local,
});

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  "Unable to load consultations.";

const ConsultationList = () => {
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);

  const [search, setSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [syncFilter, setSyncFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const loadConsultations = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      let serverConsultations = [];
      let serverAvailable = false;

      if (navigator.onLine && apiUrl) {
        try {
          const response = await axios.get(
            `${apiUrl}/consultations`,
            {
              withCredentials: true,
              timeout: 15000,
            },
          );

          const payload = response.data;

          serverConsultations =
            payload.consultations ||
            payload.data?.consultations ||
            payload.data ||
            [];

          if (!Array.isArray(serverConsultations)) {
            serverConsultations = [];
          }

          serverAvailable = true;
        } catch (requestError) {
          console.error(
            "Unable to fetch consultations from backend:",
            requestError,
          );
        }
      }

      let localConsultations = [];

      try {
        localConsultations = await getAllLocalConsultations();
      } catch (localError) {
        console.error(
          "Unable to load local consultations:",
          localError,
        );
      }

      const serverRecords = serverConsultations.map((item) =>
        normalizeConsultation(item),
      );

      const serverIds = new Set(
        serverRecords.map((item) => String(item.id)),
      );

      const localRecords = localConsultations
        .filter((item) => {
          const serverId = item.serverId;

          return !serverId || !serverIds.has(String(serverId));
        })
        .map((item) => normalizeConsultation(item, true));

      setConsultations([...serverRecords, ...localRecords]);
      setOfflineMode(!serverAvailable);

      if (!serverAvailable && localRecords.length === 0) {
        setError(
          navigator.onLine
            ? "The backend is unavailable and no local consultations were found."
            : "You are offline. No local consultations were found.",
        );
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConsultations();

    const handleOnline = () => {
      setOfflineMode(false);
      loadConsultations(false);
    };

    const handleOffline = () => {
      setOfflineMode(true);
      loadConsultations(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadConsultations]);

  const filteredConsultations = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();

    return consultations.filter((item) => {
      const searchableText = [
        item.patientName,
        ...(Array.isArray(item.symptoms) ? item.symptoms : []),
        item.notes,
        item.transcription,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !searchableText.includes(query)) {
        return false;
      }

      if (
        reviewFilter !== "all" &&
        item.reviewStatus !== reviewFilter
      ) {
        return false;
      }

      if (sourceFilter !== "all" && item.source !== sourceFilter) {
        return false;
      }

      if (syncFilter !== "all") {
        const status = item.syncStatus || "synced";

        if (syncFilter === "pending" && status !== "pending" &&
            status !== "pending-update") {
          return false;
        }

        if (
          syncFilter === "failed" &&
          status !== "failed" &&
          status !== "error"
        ) {
          return false;
        }

        if (syncFilter === "synced" && status !== "synced") {
          return false;
        }
      }

      if (dateFilter !== "all" && item.createdAt) {
        const createdAt = new Date(item.createdAt);

        if (Number.isNaN(createdAt.getTime())) {
          return false;
        }

        if (dateFilter === "today") {
          if (createdAt.toDateString() !== now.toDateString()) {
            return false;
          }
        }

        if (dateFilter === "week") {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - 7);
          startOfWeek.setHours(0, 0, 0, 0);

          if (createdAt < startOfWeek || createdAt > now) {
            return false;
          }
        }

        if (dateFilter === "month") {
          if (
            createdAt.getMonth() !== now.getMonth() ||
            createdAt.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    consultations,
    search,
    reviewFilter,
    sourceFilter,
    syncFilter,
    dateFilter,
  ]);

  const summary = useMemo(
    () => ({
      total: consultations.length,

      pendingReview: consultations.filter(
        (item) => item.reviewStatus === "pending",
      ).length,

      approved: consultations.filter(
        (item) => item.reviewStatus === "approved",
      ).length,

      pendingSync: consultations.filter(
        (item) =>
          item.syncStatus === "pending" ||
          item.syncStatus === "pending-update",
      ).length,
    }),
    [consultations],
  );

  const getReviewBadge = (status) => {
    const variants = {
      pending: "warning",
      approved: "success",
      rejected: "danger",
      not_required: "secondary",
    };

    return (
      <Badge bg={variants[status] || "secondary"}>
        {String(status || "pending")
          .replaceAll("_", " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase())}
      </Badge>
    );
  };

  const getSyncBadge = (item) => {
    if (!item.isLocal || item.syncStatus === "synced") {
      return <Badge bg="success">Synced</Badge>;
    }

    if (
      item.syncStatus === "failed" ||
      item.syncStatus === "error"
    ) {
      return <Badge bg="danger">Failed</Badge>;
    }

    return (
      <Badge bg="warning" text="dark">
        Pending Sync
      </Badge>
    );
  };

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleString();
  };

  const openConsultation = (item) => {
    if (!item.id) return;

    navigate(`/consultations/${item.id}`);
  };

  return (
    <Container fluid className="py-3">
      {/* HEADER */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <FaClipboardList className="text-primary me-2" />
            Consultations
          </h3>

          <p className="text-secondary mb-0">
            Manage patient consultations and AI-generated drafts.
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {offlineMode && (
            <Badge bg="warning" text="dark" className="p-2">
              <FaWifi className="me-1" />
              Offline Mode
            </Badge>
          )}

          
          <Button
            variant="outline-primary"
            onClick={() => loadConsultations(false)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : (
              <FaSyncAlt className="me-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* ERROR / OFFLINE NOTICE */}
      {error && (
        <Alert variant={consultations.length ? "warning" : "danger"}>
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}

      {/* SUMMARY CARDS */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-secondary small">
                  Total Consultations
                </div>
                <h3 className="fw-bold mb-0">{summary.total}</h3>
              </div>

              <FaClipboardList size={28} className="text-primary" />
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-secondary small">
                  Pending Review
                </div>
                <h3 className="fw-bold mb-0">
                  {summary.pendingReview}
                </h3>
              </div>

              <FaClock size={28} className="text-warning" />
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-secondary small">Approved</div>
                <h3 className="fw-bold mb-0">{summary.approved}</h3>
              </div>

              <FaCheckCircle size={28} className="text-success" />
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <div className="text-secondary small">Pending Sync</div>
                <h3 className="fw-bold mb-0">{summary.pendingSync}</h3>
              </div>

              <FaSyncAlt size={28} className="text-info" />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* FILTERS */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col xs={12} lg={4}>
              <Form.Label>Search</Form.Label>

              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>

                <Form.Control
                  placeholder="Search patient or symptoms..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </InputGroup>
            </Col>

            <Col xs={12} sm={6} lg={2}>
              <Form.Label>Review Status</Form.Label>

              <Form.Select
                value={reviewFilter}
                onChange={(event) => setReviewFilter(event.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="not_required">Not Required</option>
              </Form.Select>
            </Col>

            <Col xs={12} sm={6} lg={2}>
              <Form.Label>Source</Form.Label>

              <Form.Select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value)}
              >
                <option value="all">All Sources</option>
                <option value="manual">Manual</option>
                <option value="ocr">OCR</option>
                <option value="transcription">Transcription</option>
              </Form.Select>
            </Col>

            <Col xs={12} sm={6} lg={2}>
              <Form.Label>Sync Status</Form.Label>

              <Form.Select
                value={syncFilter}
                onChange={(event) => setSyncFilter(event.target.value)}
              >
                <option value="all">All Sync Statuses</option>
                <option value="synced">Synced</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </Form.Select>
            </Col>

            <Col xs={12} sm={6} lg={2}>
              <Form.Label>Date</Form.Label>

              <Form.Select
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* CONSULTATIONS TABLE */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="fw-bold mb-0">Consultation Records</h5>

            <Badge bg="primary">
              {filteredConsultations.length} Records
            </Badge>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="text-secondary mt-2 mb-0">
                Loading consultations...
              </p>
            </div>
          ) : filteredConsultations.length === 0 ? (
            <div className="text-center py-5 px-3">
              <FaClipboardList
                size={42}
                className="text-secondary mb-3"
              />

              <h5>No consultations found</h5>

              <p className="text-secondary mb-3">
                Try changing your filters or create a new consultation.
              </p>

              <Button
                variant="primary"
                onClick={() => navigate("/consultations/new")}
              >
                <FaPlus className="me-2" />
                Add Consultation
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Symptoms</th>
                    <th>Source</th>
                    <th>AI Review</th>
                    <th>Sync</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredConsultations.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold">
                          {item.patientName}
                        </div>

                        {item.isLocal && (
                          <small className="text-secondary">
                            Local record
                          </small>
                        )}
                      </td>

                      <td>{formatDate(item.createdAt)}</td>

                      <td>
                        {Array.isArray(item.symptoms) &&
                        item.symptoms.length > 0
                          ? item.symptoms.join(", ")
                          : "—"}
                      </td>

                      <td>
                        <Badge bg="info" text="dark">
                          {item.source}
                        </Badge>
                      </td>

                      <td>{getReviewBadge(item.reviewStatus)}</td>

                      <td>{getSyncBadge(item)}</td>

                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => openConsultation(item)}
                          disabled={!item.id}
                        >
                          <FaEye className="me-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ConsultationList;
