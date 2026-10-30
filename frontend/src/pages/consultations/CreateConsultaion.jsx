
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
  FaPlay,
  FaRedo,
} from "react-icons/fa";

import { createWorker } from "tesseract.js";
import { addConsultationLocally } from "../../db/consultationStorage";

const apiUrl = import.meta.env.VITE_API_URL;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const CreateConsultation = () => {
  const { patientId: routePatientId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const patientId = routePatientId || location.state?.patientId || "";

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const audioUrlRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const workerRef = useRef(null);
  const mountedRef = useRef(true);

  const [symptomsText, setSymptomsText] = useState("");
  const [notes, setNotes] = useState("");
  const [transcription, setTranscription] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [aiDraftText, setAiDraftText] = useState("");
  const [source, setSource] = useState("manual");

  const [recording, setRecording] = useState(false);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");

  const [processingOcr, setProcessingOcr] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;

        try {
          recognitionRef.current.abort();
        } catch {
          // Recognition may already have stopped.
        }

        recognitionRef.current = null;
      }

      if (mediaRecorderRef.current) {
        const recorder = mediaRecorderRef.current;

        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;

        try {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        } catch {
          // Recorder may already have stopped.
        }

        mediaRecorderRef.current = null;
      }

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });

        audioStreamRef.current = null;
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
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
  // AUDIO HELPERS
  // ============================================

  const releaseAudioStream = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      audioStreamRef.current = null;
    }
  };

  const clearPreviousAudio = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setRecordedAudioUrl("");
    setHasRecordedAudio(false);
  };

  // ============================================
  // START AUDIO RECORDING
  // ============================================

  const startVoiceRecording = async () => {
    if (recording || saving || processingOcr || generatingAi) {
      return;
    }

    setError("");
    setSuccess("");

    console.clear();
    console.log("========== AUDIO RECORDING DEBUG ==========");
    console.log("Browser:", navigator.userAgent);
    console.log("MediaRecorder available:", typeof MediaRecorder !== "undefined");
    console.log(
      "getUserMedia available:",
      Boolean(navigator.mediaDevices?.getUserMedia),
    );

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof window.MediaRecorder === "undefined"
    ) {
      setError(
        "Audio recording is not supported. Try a recent version of Chrome or Edge using localhost or HTTPS.",
      );
      console.error("Microphone recording APIs are unavailable.");
      return;
    }

    clearPreviousAudio();
    audioChunksRef.current = [];

    let stream;

    try {
      console.log("Requesting microphone permission...");

      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      audioStreamRef.current = stream;

      console.log("Microphone permission granted.");
      console.log("Audio tracks:", stream.getAudioTracks().length);

      stream.getAudioTracks().forEach((track, index) => {
        console.log(`Audio track ${index + 1}:`, {
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings(),
        });

        track.onmute = () => {
          console.warn(`Microphone track ${index + 1} became muted.`);
        };

        track.onunmute = () => {
          console.log(`Microphone track ${index + 1} became unmuted.`);
        };
      });

      const supportedMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];

      console.log("Checking supported audio formats...");

      supportedMimeTypes.forEach((type) => {
        console.log(type, MediaRecorder.isTypeSupported(type));
      });

      const selectedMimeType = supportedMimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );

      const mediaRecorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      console.log("Selected MIME type:", mediaRecorder.mimeType);
      console.log("Initial recorder state:", mediaRecorder.state);

      mediaRecorder.onstart = () => {
        console.log("MediaRecorder started:", mediaRecorder.state);
      };

      mediaRecorder.ondataavailable = (event) => {
        console.log("Audio data event received.");
        console.log("Chunk size:", event.data?.size ?? 0);
        console.log("Chunk MIME type:", event.data?.type ?? "unknown");

        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);

          const totalSize = audioChunksRef.current.reduce(
            (sum, chunk) => sum + chunk.size,
            0,
          );

          console.log("Chunks collected:", audioChunksRef.current.length);
          console.log("Accumulated size:", totalSize, "bytes");
        } else {
          console.warn("Received an empty audio chunk.");
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error || event);

        if (mountedRef.current) {
          setError(
            `Audio recorder error: ${event.error?.message || event.error?.name || "Unknown error"}`,
          );
          setRecording(false);
        }

        releaseAudioStream();
      };

      mediaRecorder.onstop = () => {
        console.log("========== RECORDING STOPPED ==========");
        console.log("Final recorder state:", mediaRecorder.state);

        const chunks = [...audioChunksRef.current];

        const mimeType =
          mediaRecorder.mimeType ||
          chunks.find((chunk) => chunk.type)?.type ||
          "audio/webm";

        console.log("Total chunks:", chunks.length);
        console.log("MIME type:", mimeType);

        const audioBlob = new Blob(chunks, { type: mimeType });

        console.log("Final audio size:", audioBlob.size, "bytes");
        console.log("Final Blob MIME type:", audioBlob.type);

        releaseAudioStream();

        if (mountedRef.current) {
          setRecording(false);
        }

        if (mediaRecorderRef.current === mediaRecorder) {
          mediaRecorderRef.current = null;
        }

        if (!mountedRef.current) {
          audioChunksRef.current = [];
          return;
        }

        if (chunks.length === 0 || audioBlob.size === 0) {
          console.error("FAILED: No audio data was captured.");

          setError(
            "No audio data was captured. Check the microphone and browser console, then try again.",
          );

          audioChunksRef.current = [];
          return;
        }

        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
        }

        const audioUrl = URL.createObjectURL(audioBlob);

        audioUrlRef.current = audioUrl;

        console.log("Audio object URL created:", audioUrl);
        console.log("Audio Blob created successfully.");
        console.log("========== END RECORDING DEBUG ==========");

        setRecordedAudioUrl(audioUrl);
        setHasRecordedAudio(true);

        setSuccess(
          `Recording captured (${(audioBlob.size / 1024).toFixed(1)} KB). Try playing it below.`,
        );

        audioChunksRef.current = [];
      };

      // Start actual audio recording.
      mediaRecorder.start(1000);

      console.log("Recorder state after start:", mediaRecorder.state);

      setRecording(true);
      setSource("transcription");

      // ========================================
      // SPEECH-TO-TEXT
      // ========================================

      const SpeechRecognition = getRecognitionConstructor();

      if (!SpeechRecognition) {
        console.warn("SpeechRecognition is not supported in this browser.");

        setError(
          "Audio recording is active, but speech-to-text is unsupported. You can still play your audio and enter transcription manually.",
        );

        return;
      }

      try {
        const recognition = new SpeechRecognition();

        recognition.lang = "en-IN";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          if (mountedRef.current) {
            setSuccess("Recording audio and listening for speech...");
          }
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

          if (finalText.trim()) {
            setTranscription((previous) =>
              [previous.trim(), finalText.trim()]
                .filter(Boolean)
                .join(" "),
            );
          }

          if (interimText.trim()) {
            setSuccess(`Listening: ${interimText.trim()}`);
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);

          if (!mountedRef.current) return;

          if (event.error === "not-allowed") {
            setError(
              "Speech recognition permission was denied. Audio recording may still work.",
            );
          } else if (
            event.error !== "no-speech" &&
            event.error !== "aborted"
          ) {
            setError(
              `Speech-to-text error: ${event.error}. The audio recorder may still be recording.`,
            );
          }
        };

        recognition.onend = () => {
          if (recognitionRef.current === recognition) {
            recognitionRef.current = null;
          }

          console.log("Speech recognition ended.");
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (recognitionError) {
        console.error(
          "Unable to start speech recognition:",
          recognitionError,
        );

        setError(
          "Audio recording is running, but speech-to-text could not start. You can enter the transcription manually.",
        );
      }
    } catch (err) {
      console.error("========== MICROPHONE ERROR ==========");
      console.error("Name:", err.name);
      console.error("Message:", err.message);
      console.error(err);

      if (stream && audioStreamRef.current !== stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      releaseAudioStream();

      const message =
        err.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access in your browser settings."
          : err.name === "NotFoundError"
            ? "No microphone was found. Connect a microphone and try again."
            : err.name === "NotReadableError"
              ? "The microphone is busy or unavailable. Close other apps using it and try again."
              : err.message || "Unable to start audio recording.";

      if (mountedRef.current) {
        setError(message);
        setRecording(false);
      }

      if (mediaRecorderRef.current) {
        const recorder = mediaRecorderRef.current;

        try {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        } catch {
          // Ignore cleanup errors.
        }

        mediaRecorderRef.current = null;
      }
    }
  };

  // ============================================
  // STOP AUDIO RECORDING
  // ============================================

  const stopVoiceRecording = () => {
    console.log("Stop recording requested.");

    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;

      try {
        recognition.stop();
      } catch (err) {
        console.warn("Speech recognition already stopped:", err);
      }
    }

    const mediaRecorder = mediaRecorderRef.current;

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      console.log("Stopping recorder in state:", mediaRecorder.state);

      try {
        mediaRecorder.stop();
      } catch (err) {
        console.error("Unable to stop recorder:", err);
        setError("Unable to stop the audio recording.");
        setRecording(false);
        releaseAudioStream();
      }
    } else {
      console.warn("Recorder is missing or already inactive.");
      setRecording(false);
      releaseAudioStream();
    }
  };

  // ============================================
  // DELETE AUDIO
  // ============================================

  const deleteRecordedAudio = () => {
    if (recording) {
      stopVoiceRecording();
    }

    clearPreviousAudio();
    audioChunksRef.current = [];

    setSuccess("Temporary audio recording cleared.");
    setError("");
  };

  // ============================================
  // AUDIO PLAYER EVENTS
  // ============================================

  const handleAudioLoaded = (event) => {
    const audio = event.currentTarget;

    console.log("========== AUDIO PLAYER DEBUG ==========");
    console.log("Audio duration:", audio.duration);
    console.log("Audio readyState:", audio.readyState);
    console.log("Audio networkState:", audio.networkState);
    console.log("Audio MIME type:", audio.currentSrc);
    console.log("Audio error:", audio.error);

    if (Number.isFinite(audio.duration)) {
      console.log("Audio metadata loaded successfully.");
    } else {
      console.warn("Audio duration is not available.");
    }
  };

  const handleAudioCanPlay = () => {
    console.log("SUCCESS: Browser reports audio can play.");
  };

  const handleAudioPlay = () => {
    console.log("Audio playback started.");
  };

  const handleAudioError = (event) => {
    const audio = event.currentTarget;

    console.error("========== AUDIO PLAYBACK ERROR ==========");
    console.error("MediaError:", audio.error);
    console.error("Error code:", audio.error?.code);
    console.error("Error message:", audio.error?.message);
    console.error("Source:", audio.currentSrc);

    setError(
      `Unable to play audio. Browser media error code: ${audio.error?.code ?? "unknown"}. Check the Console.`,
    );
  };

  const replayAudio = async () => {
    const audio = audioPlayerRef.current;

    if (!audio) {
      setError("Audio player is not available.");
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play();

      console.log("Replay requested successfully.");
    } catch (err) {
      console.error("Audio play() failed:", err);

      setError(
        `Playback failed: ${err.message}. Try pressing Play directly on the audio player.`,
      );
    }
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
      console.error("OCR error:", err);
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
      console.error("AI draft error:", err);

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
  // ============================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (recording) {
      setError("Stop the recording before saving the consultation.");
      return;
    }

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

          if (status || navigator.onLine || !connectivityError) {
            throw requestError;
          }
        }
      }

      await addConsultationLocally(consultationData);

      setSuccess(
        "Consultation saved locally. It can be synchronized when the connection returns.",
      );
    } catch (err) {
      console.error("Save consultation error:", err);

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
          <Badge bg="secondary">Patient ID: {patientId}</Badge>
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
            <h5 className="mb-0">2. Voice Input & Audio Recording</h5>
          </Card.Header>

          <Card.Body className="p-4">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              {!recording ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={startVoiceRecording}
                  disabled={saving || processingOcr || generatingAi}
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

            {recording && (
              <Alert variant="warning">
                Your microphone is recording. Speak for 5–10 seconds, then
                click Stop Recording.
              </Alert>
            )}

            {hasRecordedAudio && recordedAudioUrl && (
              <Card className="bg-light border mb-4">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                    <h6 className="mb-0">
                      <FaPlay className="me-2" />
                      Recorded Audio
                    </h6>

                    <Badge bg="success">Ready to test</Badge>
                  </div>

                  <audio
                    ref={audioPlayerRef}
                    src={recordedAudioUrl}
                    controls
                    preload="metadata"
                    className="w-100"
                    onLoadedMetadata={handleAudioLoaded}
                    onCanPlay={handleAudioCanPlay}
                    onPlay={handleAudioPlay}
                    onError={handleAudioError}
                  >
                    Your browser does not support audio playback.
                  </audio>

                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <Button
                      type="button"
                      variant="outline-primary"
                      size="sm"
                      onClick={replayAudio}
                    >
                      <FaRedo className="me-2" />
                      Replay from Start
                    </Button>

                    <Button
                      type="button"
                      variant="outline-danger"
                      size="sm"
                      onClick={deleteRecordedAudio}
                      disabled={saving}
                    >
                      Delete Recording
                    </Button>
                  </div>

                  <Form.Text className="text-muted d-block mt-2">
                    Debug mode: this audio is temporarily stored in your
                    browser. It is not uploaded or permanently saved.
                  </Form.Text>
                </Card.Body>
              </Card>
            )}

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
                disabled={processingOcr || saving || generatingAi || recording}
              />

              <Form.Text className="text-muted">
                Select a clear image of a medical document. Maximum file size:
                10 MB.
              </Form.Text>
            </Form.Group>

            {processingOcr && (
              <div className="mb-3">
                <Spinner size="sm" animation="border" className="me-2" />
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
                generatingAi || saving || recording || processingOcr
              }
            >
              {generatingAi ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
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
              saving || recording || processingOcr || generatingAi
            }
          >
            {saving ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
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
