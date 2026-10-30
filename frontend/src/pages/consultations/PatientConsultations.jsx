import "bootstrap/dist/css/bootstrap.min.css";

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Spinner,
  Table,
} from "react-bootstrap";

import { getLocalConsultationsByPatient } from "../../db/consultationStorage";

const apiUrl = import.meta.env.VITE_API_URL;

const PatientConsultations = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);

  const fetchConsultations = useCallback(async () => {
    if (!patientId) {
      setError("Patient ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!navigator.onLine) {
        const localRecords = await getLocalConsultationsByPatient(patientId);

        setConsultations(localRecords);
        setOffline(true);
        return;
      }

      const response = await axios.get(
        `${apiUrl}/patients/${patientId}/consultations`,
        {
          withCredentials: true,
          timeout: 15000,
        },
      );

      const data =
        response.data?.consultations ??
        response.data?.data?.consultations ??
        response.data?.data ??
        response.data;

      const records = Array.isArray(data) ? data : [];

      setConsultations(records);
      setOffline(false);
    } catch (err) {
      // If the server is unavailable, show locally saved records.
      try {
        const localRecords = await getLocalConsultationsByPatient(patientId);

        setConsultations(localRecords);
        setOffline(true);

        if (localRecords.length === 0) {
          setError(
            "Unable to fetch consultations. No local consultations were found.",
          );
        }
      } catch {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to fetch consultations.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const getReviewVariant = (status) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "pending":
        return "warning";
      default:
        return "secondary";
    }
  };

  return (
    <Container className="py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Consultations</h2>
          <p className="text-secondary mb-0">
            View and manage this patient's consultations.
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={() => navigate(-1)}>
            Back
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate(`/patients/${patientId}/consultations/new`)}
          >
            + New Consultation
          </Button>
        </div>
      </div>

      {offline && (
        <Alert variant="warning">
          You are offline or the server is unavailable. Showing locally saved
          consultations when available.
        </Alert>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
              <p className="mt-2 text-secondary">Loading consultations...</p>
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-5">
              <h5>No consultations found</h5>
              <p className="text-secondary">
                Create the first consultation for this patient.
              </p>

              <Button
                onClick={() =>
                  navigate(`/patients/${patientId}/consultations/new`)
                }
              >
                Create Consultation
              </Button>
            </div>
          ) : (
            <Table responsive hover className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Symptoms</th>
                  <th>Source</th>
                  <th>Review Status</th>
                  <th>Sync Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {consultations.map((consultation) => {
                  const consultationId =
                    consultation._id ||
                    consultation.serverId ||
                    consultation.id;

                  const date = consultation.createdAt || consultation.updatedAt;

                  return (
                    <tr key={consultationId}>
                      <td>
                        {date ? new Date(date).toLocaleDateString() : "—"}
                      </td>

                      <td>
                        {Array.isArray(consultation.symptoms) &&
                        consultation.symptoms.length > 0
                          ? consultation.symptoms.join(", ")
                          : "No symptoms recorded"}
                      </td>

                      <td>{consultation.source || "manual"}</td>

                      <td>
                        <Badge bg={getReviewVariant(consultation.reviewStatus)}>
                          {consultation.reviewStatus || "pending"}
                        </Badge>
                      </td>

                      <td>
                        <Badge
                          bg={
                            consultation.syncStatus === "synced" ||
                            consultation._id
                              ? "success"
                              : "warning"
                          }
                        >
                          {consultation.syncStatus ||
                            (consultation._id ? "synced" : "local")}
                        </Badge>
                      </td>

                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() =>
                            navigate(`/consultations/${consultationId}`, {
                              state: { consultation },
                            })
                          }
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <div className="text-end mt-3">
        <Button
          variant="outline-primary"
          onClick={fetchConsultations}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>
    </Container>
  );
};

export default PatientConsultations;
