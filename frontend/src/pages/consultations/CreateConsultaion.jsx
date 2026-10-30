
import "bootstrap/dist/css/bootstrap.min.css";

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
  FaMicrophone,
  FaStop,
  FaRobot,
  FaSave,
  FaArrowLeft,
  FaFileImage,
} from "react-icons/fa";

import { createWorker } from "tesseract.js";
import { addConsultationLocally } from "../../db/consultationStorage";

const apiUrl = import.meta.env.VITE_API_URL;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const CreateConsultation = () => {
  const { patientId: routePatientId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Accept patientId from either route parameters or navigation state.
  const patientId =
    routePatientId || location.state?.patientId || "";

  const recognitionRef = useRef(null);
  const workerRef = useRef(null);
  const mountedRef = useRef(true);

  const [symptomsText, setSymptomsText] = useState("");
  const [notes, setNotes] = useState("");
  const [transcription, setTranscription] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [aiDraftText, setAiDraftText] = useState("");
  const [source, setSource] = useState("manual");

  const [recording, setRecording] = useState(false);
  const [processingOcr, setProcessingOcr] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;

        try {
          recognitionRef.current.stop();
        } catch {
          // Recognition may already have stopped.
        }

        recognitionRef.current = null;
      }

      if (workerRef.current) {
        workerRef.current.terminate().catch(() => {});
        workerRef.current = null;
      }
    };
  }, []);

  const getRecognitionConstructor = () =>
    window.SpeechRecognition || window.webkitSpeechRecognition;

  // ============================================
  // VOICE INPUT
  // ============================================

  const startVoiceRecording = () => {
    setError("");
    setSuccess("");

    const SpeechRecognition = getRecognitionConstructor();

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported by this browser. Try a supported version of Chrome or enter the transcription manually.",
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();

      recognition.lang = "en-IN";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        if (!mountedRef.current) return;

        setRecording(true);
        setSource("transcription");
      };

      recognition.onresult = (event) => {
        if (!mountedRef.current) return;

        let finalText = "";
        let interimText = "";

        for (
          let index = event.resultIndex;
          index < event.results.length;
          index++
        ) {
          const result = event.results[index];
          const text = result[0]?.transcript?.trim();

          if (!text) continue;

          if (result.isFinal) {
            finalText += `${text} `;
          } else {
            interimText += `${text} `;
          }
        }

        // Keep finalized speech separate from temporary interim results.
        if (finalText.trim()) {
          setTranscription((previous) =>
            [previous.trim(), finalText.trim()]
              .filter(Boolean)
              .join(" "),
          );
        }

        // Interim speech is shown only as a preview.
        // It is not added to the saved transcription.
        if (interimText.trim()) {
          setSuccess(`Listening: ${interimText.trim()}`);
        }
      };

      recognition.onerror = (event) => {
        if (!mountedRef.current) return;

        if (event.error === "not-allowed") {
          setError(
            "Microphone access was denied. Allow microphone access in your browser settings.",
          );
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          setError(
            `Speech recognition failed: ${event.error}. You can enter the transcription manually.`,
          );
        }
      };

      recognition.onend = () => {
        if (!mountedRef.current) return;

        setRecording(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setError(err.message || "Unable to start voice recording.");
      setRecording(false);
      recognitionRef.current = null;
    }
  };

  const stopVoiceRecording = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Recognition may already have stopped.
    }

    recognitionRef.current = null;
    setRecording(false);
  };

  // ============================================
  // OCR IMAGE INPUT
  // ============================================

  const handleImageUpload = async (event) => {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      input.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("The image must be smaller than 10 MB.");
      input.value = "";
      return;
    }

    let worker;

    try {
      setProcessingOcr(true);

      worker = await createWorker("eng");
      workerRef.current = worker;

      const result = await worker.recognize(file);
      const extractedText = result.data.text.trim();

      if (!extractedText) {
        setError(
          "No readable text was detected. Try uploading a clearer image.",
        );
        return;
      }

      setOcrText((previous) =>
        [previous.trim(), extractedText].filter(Boolean).join("\n\n"),
      );

      setSource("ocr");

      setSuccess(
        "Text extracted successfully. Review the OCR text for errors before generating the AI draft.",
      );
    } catch (err) {
      setError(err.message || "Unable to extract text from the image.");
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Ignore worker cleanup errors.
        }
      }

      if (workerRef.current === worker) {
        workerRef.current = null;
      }

      if (mountedRef.current) {
        setProcessingOcr(false);
      }

      input.value = "";
    }
  };

  // ============================================
  // PREPARE SYMPTOMS
  // ============================================

  const getSymptoms = () =>
    symptomsText
      .split(",")
      .map((symptom) => symptom.trim())
      .filter(Boolean);

  // ============================================
  // GENERATE AI CLINICAL DRAFT
  // POST /ai/clinical-draft
  // ============================================

  const generateAiDraft = async () => {
    setError("");
    setSuccess("");

    if (!patientId || patientId.startsWith("local-")) {
      setError(
        "A valid server patient ID is required to generate an AI clinical draft. Synchronize the patient first.",
      );
      return;
    }

    const symptoms = getSymptoms();

    const combinedText = [
      transcription.trim()
        ? `VOICE TRANSCRIPTION:\n${transcription.trim()}`
        : "",
      ocrText.trim() ? `OCR TEXT:\n${ocrText.trim()}` : "",
      notes.trim() ? `CLINICAL NOTES:\n${notes.trim()}` : "",
      symptoms.length
        ? `REPORTED SYMPTOMS:\n${symptoms.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!combinedText) {
      setError(
        "Enter symptoms or clinical notes, record a voice transcription, or upload a document image before generating the AI draft.",
      );
      return;
    }

    try {
      setGeneratingAi(true);

      const response = await axios.post(
        `${apiUrl}/ai/clinical-draft`,
        {
          patientId,
          symptoms,
          notes: notes.trim(),
          transcription: transcription.trim(),
          ocrText: ocrText.trim(),
          clinicalText: combinedText,
        },
        {
          withCredentials: true,
          timeout: 120000,
        },
      );

      const draft =
        response.data?.aiDraft ||
        response.data?.draft ||
        response.data?.data?.aiDraft;

      if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
        throw new Error(
          "The AI endpoint did not return a valid draft object. Check the backend response format.",
        );
      }

      setAiDraftText(JSON.stringify(draft, null, 2));

      setSuccess(
        "AI draft generated successfully. Review the information carefully before saving.",
      );
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.code === "ECONNABORTED"
          ? "The AI request timed out. Check whether the local AI model is running and try again."
          : err.message) ||
        "Unable to generate the AI draft.";

      setError(message);
    } finally {
      setGeneratingAi(false);
    }
  };

  // ============================================
  // SAVE CONSULTATION
  // POST /consultations
  // ============================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!patientId || patientId.startsWith("local-")) {
      setError(
        "A valid server patient ID is required. Synchronize the patient before creating this consultation.",
      );
      return;
    }

    const symptoms = getSymptoms();

    let aiDraft = null;

    if (aiDraftText.trim()) {
      try {
        aiDraft = JSON.parse(aiDraftText);

        if (
          !aiDraft ||
          typeof aiDraft !== "object" ||
          Array.isArray(aiDraft)
        ) {
          setError("The AI draft must be a valid JSON object.");
          return;
        }
      } catch {
        setError("The AI draft contains invalid JSON. Please correct it.");
        return;
      }
    }

    const consultationData = {
      patientId,
      symptoms,
      notes: notes.trim(),
      transcription: transcription.trim(),
      ocrText: ocrText.trim(),
      aiDraft,
      source,
      reviewStatus: aiDraft ? "pending" : "not_required",
    };

    try {
      setSaving(true);

      if (navigator.onLine) {
        try {
          const response = await axios.post(
            `${apiUrl}/consultations`,
            consultationData,
            {
              withCredentials: true,
              timeout: 20000,
            },
          );

          const savedConsultation =
            response.data?.consultation ||
            response.data?.data?.consultation;

          const savedId =
            savedConsultation?._id || savedConsultation?.id;

          if (!response.data?.success && !savedConsultation) {
            throw new Error(
              response.data?.message ||
                "The server did not confirm that the consultation was saved.",
            );
          }

          if (savedId) {
            navigate(`/consultations/${savedId}`, {
              state: {
                consultation: savedConsultation,
              },
            });
            return;
          }

          setSuccess("Consultation created successfully.");
          return;
        } catch (requestError) {
          const status = requestError.response?.status;

          const connectivityError = [
            "ERR_NETWORK",
            "ECONNABORTED",
          ].includes(requestError.code);

          // Do not store a failed validation, authentication, or server
          // request as a local record. Only attempt fallback for an
          // actual connectivity problem while the browser is offline.
          if (status || navigator.onLine || !connectivityError) {
            throw requestError;
          }
        }
      }

      // Local fallback is useful only if the storage layer supports
      // this patient ID. The current storage helper may reject local IDs.
      await addConsultationLocally(consultationData);

      setSuccess(
        "Consultation saved locally. It can be synchronized when the connection returns.",
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save the consultation.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // UI
  // ============================================

  return (
    <Container className="py-4">
      <div className="mb-4">
        <Button
          variant="outline-secondary"
          className="mb-3"
          onClick={() => navigate(-1)}
          disabled={saving}
        >
          <FaArrowLeft className="me-2" />
          Back
        </Button>

        <h2 className="fw-bold">New Consultation</h2>

        <p className="text-secondary">
          Record clinical information using voice, medical document images,
          or manual entry.
        </p>

        {patientId && (
          <Badge bg="secondary">
            Patient ID: {patientId}
          </Badge>
        )}
      </div>

      {error && (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {/* 1. Clinical information */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3">
            <h5 className="mb-0">1. Clinical Information</h5>
          </Card.Header>

          <Card.Body className="p-4">
            <Form.Group className="mb-3">
              <Form.Label>Symptoms</Form.Label>

              <Form.Control
                value={symptomsText}
                onChange={(event) => setSymptomsText(event.target.value)}
                placeholder="Fever, headache, cough"
                maxLength={5000}
                disabled={saving}
              />

              <Form.Text className="text-muted">
                Separate symptoms with commas.
              </Form.Text>
            </Form.Group>

            <Form.Group>
              <Form.Label>Clinical Notes</Form.Label>

              <Form.Control
                as="textarea"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Enter clinical observations and notes..."
                maxLength={20000}
                disabled={saving}
              />
            </Form.Group>
          </Card.Body>
        </Card>

        {/* 2. Voice input */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3">
            <h5 className="mb-0">2. Voice Input</h5>
          </Card.Header>

          <Card.Body className="p-4">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              {!recording ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={startVoiceRecording}
                  disabled={
                    saving ||
                    processingOcr ||
                    generatingAi
                  }
                >
                  <FaMicrophone className="me-2" />
                  Record Voice
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="dark"
                  onClick={stopVoiceRecording}
                >
                  <FaStop className="me-2" />
                  Stop Recording
                </Button>
              )}

              {recording && (
                <Badge bg="danger" className="p-2">
                  Recording...
                </Badge>
              )}
            </div>

            <Form.Group>
              <Form.Label>Voice Transcription</Form.Label>

              <Form.Control
                as="textarea"
                rows={5}
                value={transcription}
                onChange={(event) => setTranscription(event.target.value)}
                placeholder="Spoken words will appear here. You can also type or correct the transcription."
                maxLength={50000}
                disabled={saving}
              />

              <Form.Text className="text-muted">
                Review the transcription for mistakes before using it in the
                clinical draft.
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>

        {/* 3. OCR */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3">
            <h5 className="mb-0">3. OCR Document Input</h5>
          </Card.Header>

          <Card.Body className="p-4">
            <Form.Group className="mb-3">
              <Form.Label>Upload Medical Document Image</Form.Label>

              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={
                  processingOcr ||
                  saving ||
                  generatingAi
                }
              />

              <Form.Text className="text-muted">
                Select a clear image of a medical document. Maximum file size:
                10 MB.
              </Form.Text>
            </Form.Group>

            {processingOcr && (
              <div className="mb-3">
                <Spinner
                  size="sm"
                  animation="border"
                  className="me-2"
                />
                Extracting text from the image...
              </div>
            )}

            <Form.Group>
              <Form.Label>Extracted OCR Text</Form.Label>

              <Form.Control
                as="textarea"
                rows={6}
                value={ocrText}
                onChange={(event) => setOcrText(event.target.value)}
                placeholder="Extracted document text will appear here. Check it for errors."
                maxLength={50000}
                disabled={saving}
              />
            </Form.Group>
          </Card.Body>
        </Card>

        {/* 4. AI draft */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white py-3">
            <h5 className="mb-0">4. AI Clinical Draft</h5>
          </Card.Header>

          <Card.Body className="p-4">
            <p className="text-secondary">
              Generate a structured draft from the symptoms, clinical notes,
              voice transcription, and OCR text. The AI output is a draft,
              not a confirmed diagnosis or treatment plan.
            </p>

            <Button
              type="button"
              variant="info"
              className="mb-3"
              onClick={generateAiDraft}
              disabled={
                generatingAi ||
                saving ||
                recording ||
                processingOcr
              }
            >
              {generatingAi ? (
                <>
                  <Spinner
                    size="sm"
                    animation="border"
                    className="me-2"
                  />
                  Generating Draft...
                </>
              ) : (
                <>
                  <FaRobot className="me-2" />
                  Generate AI Draft
                </>
              )}
            </Button>

            <Form.Group>
              <Form.Label>AI Draft (JSON)</Form.Label>

              <Form.Control
                as="textarea"
                rows={10}
                value={aiDraftText}
                onChange={(event) => setAiDraftText(event.target.value)}
                placeholder={`{
  "summary": "",
  "symptoms": [],
  "observations": [],
  "suggestions": [],
  "missingInformation": [],
  "requiresClinicianReview": true
}`}
                maxLength={50000}
                disabled={saving}
              />

              <Form.Text className="text-muted">
                Review and correct the draft before saving. Do not treat
                unverified AI-generated information as confirmed clinical
                findings.
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>

        {/* Actions */}
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <Button
            type="button"
            variant="outline-secondary"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={
              saving ||
              recording ||
              processingOcr ||
              generatingAi
            }
          >
            {saving ? (
              <>
                <Spinner
                  size="sm"
                  animation="border"
                  className="me-2"
                />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Save Consultation
              </>
            )}
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default CreateConsultation;
