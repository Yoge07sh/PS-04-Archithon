import "bootstrap/dist/css/bootstrap.min.css";

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Form,
  Spinner,
} from "react-bootstrap";

import {
  getAllLocalConsultations,
  updateConsultationLocally,
} from "../../db/consultationStorage";

const apiUrl = import.meta.env.VITE_API_URL;

const ConsultationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [symptomsText, setSymptomsText] = useState("");
  const [notes, setNotes] = useState("");
  const [transcription, setTranscription] = useState("");
  const [aiDraftText, setAiDraftText] = useState("");

  const isLocal = String(id).startsWith("local-");

  const populateForm = (data) => {
    setConsultation(data);
    setSymptomsText(
      Array.isArray(data.symptoms) ? data.symptoms.join(", ") : "",
    );
    setNotes(data.notes || "");
    setTranscription(data.transcription || "");
    setAiDraftText(
      data.aiDraft == null ? "" : JSON.stringify(data.aiDraft, null, 2),
    );
  };

  const fetchConsultation = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (String(id).startsWith("local-")) {
        const localRecords = await getAllLocalConsultations();

        const record = localRecords.find(
          (item) => item.id === id || item.serverId === id,
        );

        if (!record) {
          throw new Error("Local consultation not found.");
        }

        populateForm(record);
      } else {
        const response = await axios.get(`${apiUrl}/consultations/${id}`, {
          withCredentials: true,
          timeout: 15000,
        });

        const data =
          response.data?.consultation ||
          response.data?.data?.consultation ||
          response.data?.data ||
          response.data;

        if (!data || typeof data !== "object" || !data._id) {
          throw new Error(
            "The server response did not contain a consultation.",
          );
        }

        populateForm(data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load consultation.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchConsultation();
  }, [fetchConsultation]);

  const handleSave = async (event) => {
    event.preventDefault();

    if (!consultation) return;

    setSaving(true);
    setError("");
    setMessage("");

    let aiDraft = null;

    if (aiDraftText.trim()) {
      try {
        aiDraft = JSON.parse(aiDraftText);
      } catch {
        setError("AI Draft must contain valid JSON.");
        setSaving(false);
        return;
      }
    }

    const updatedData = {
      symptoms: symptomsText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      notes: notes.trim(),
      transcription: transcription.trim(),
      aiDraft,
    };

    try {
      if (isLocal) {
        await updateConsultationLocally(id, updatedData);

        setMessage("Consultation saved locally.");
        await fetchConsultation();
      } else {
        const response = await axios.put(
          `${apiUrl}/consultations/${id}`,
          updatedData,
          {
            withCredentials: true,
            timeout: 15000,
          },
        );

        const updatedConsultation =
          response.data?.consultation || response.data?.data?.consultation;

        setMessage("Consultation updated successfully.");

        if (updatedConsultation?._id) {
          populateForm(updatedConsultation);
        } else {
          await fetchConsultation();
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to update consultation.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (status) => {
    if (!consultation || isLocal) {
      setError("Synchronize this consultation before reviewing its AI draft.");
      return;
    }

    if (!["approved", "rejected"].includes(status)) {
      setError("Invalid review status.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${status} this AI draft?`,
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await axios.patch(
        `${apiUrl}/consultations/${id}/review`,
        { status },
        {
          withCredentials: true,
          timeout: 15000,
        },
      );

      const updatedConsultation =
        response.data?.consultation || response.data?.data?.consultation;

      if (updatedConsultation) {
        populateForm(updatedConsultation);
      } else {
        await fetchConsultation();
      }

      setMessage(`AI draft ${status} successfully.`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to review AI draft.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
        <p className="mt-2">Loading consultation...</p>
      </Container>
    );
  }

  if (!consultation) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error || "Consultation not found."}</Alert>

        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Container>
    );
  }

  const patientId = consultation.patientId;
  const reviewStatus = consultation.reviewStatus || "pending";

  return (
    <Container className="py-4">
      <div className="mb-4">
        <Button
          variant="outline-secondary"
          className="mb-3"
          onClick={() =>
            patientId
              ? navigate(`/patients/${patientId}/consultations`)
              : navigate(-1)
          }
        >
          ← Back to Consultations
        </Button>

        <h2 className="fw-bold">Consultation Details</h2>

        <div className="d-flex flex-wrap gap-2 mt-2">
          <Badge bg="secondary">
            Source: {consultation.source || "manual"}
          </Badge>

          <Badge
            bg={
              reviewStatus === "approved"
                ? "success"
                : reviewStatus === "rejected"
                  ? "danger"
                  : "warning"
            }
          >
            Review: {reviewStatus}
          </Badge>

          <Badge
            bg={
              consultation.syncStatus === "synced" || consultation._id
                ? "success"
                : "warning"
            }
          >
            Sync:{" "}
            {consultation.syncStatus || (consultation._id ? "synced" : "local")}
          </Badge>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h5 className="fw-bold mb-3">Consultation Information</h5>

          <p>
            <strong>Created:</strong>{" "}
            {consultation.createdAt
              ? new Date(consultation.createdAt).toLocaleString()
              : "Not available"}
          </p>

          <p>
            <strong>Patient ID:</strong> {String(patientId || "—")}
          </p>

          <p className="mb-0">
            <strong>Consultation ID:</strong>{" "}
            {String(
              consultation._id || consultation.serverId || consultation.id,
            )}
          </p>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <h5 className="fw-bold mb-3">Edit Consultation</h5>

          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label>Symptoms</Form.Label>

              <Form.Control
                value={symptomsText}
                onChange={(event) => setSymptomsText(event.target.value)}
                placeholder="Fever, headache, cough"
              />

              <Form.Text className="text-muted">
                Separate symptoms with commas.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Clinical Notes</Form.Label>

              <Form.Control
                as="textarea"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Transcription</Form.Label>

              <Form.Control
                as="textarea"
                rows={4}
                value={transcription}
                onChange={(event) => setTranscription(event.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>AI Draft (JSON)</Form.Label>

              <Form.Control
                as="textarea"
                rows={6}
                value={aiDraftText}
                onChange={(event) => setAiDraftText(event.target.value)}
                placeholder='{"summary": "", "suggestions": []}'
              />
            </Form.Group>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <h5 className="fw-bold mb-2">AI Draft Review</h5>

          <p className="text-secondary">
            Review the AI-generated content before approving it. AI output
            should not be treated as a confirmed diagnosis.
          </p>

          {isLocal ? (
            <Alert variant="info">
              This consultation is stored locally. Synchronize it before
              reviewing the draft on the server.
            </Alert>
          ) : reviewStatus === "pending" ? (
            <div className="d-flex flex-wrap gap-2">
              <Button
                variant="success"
                disabled={saving}
                onClick={() => handleReview("approved")}
              >
                Approve Draft
              </Button>

              <Button
                variant="danger"
                disabled={saving}
                onClick={() => handleReview("rejected")}
              >
                Reject Draft
              </Button>
            </div>
          ) : (
            <Alert variant="secondary" className="mb-0">
              This draft has already been marked as{" "}
              <strong>{reviewStatus}</strong>.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ConsultationDetails;
