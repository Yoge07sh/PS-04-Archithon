# Offline-First Multimodal AI Assistant for Healthcare

PS-04 is a prototype concept for helping healthcare workers document and retrieve patient information in rural and underserved areas with limited or unreliable internet connectivity.

> **Status:** Project documentation and problem statement only. The application has not been implemented yet.

## Problem

Patient information can be spread across handwritten notes, medical reports, conversations, and fragmented digital records. Transcribing and organizing it manually is time-consuming and can leave records incomplete. This project explores an offline-first assistant that helps organize this information while keeping clinical decisions with healthcare professionals.

## Goals

- Capture consultation notes by voice and transcribe them locally where supported.
- Scan medical documents and use OCR to extract text.
- Support translation for available languages.
- Help structure unstructured notes into editable patient case files.
- Store patient records and consultation history locally and make them searchable offline.
- Use relevant history to prepare clinical summaries for clinician review.
- Synchronize pending changes securely when connectivity returns.
- Preserve data integrity and make synchronization conflicts visible and resolvable.
- Work on resource-constrained devices and remain usable during network interruptions.

## Core workflows

1. A healthcare worker opens or creates a patient record on the device.
2. They capture a consultation note by voice or text, or scan a medical document.
3. Supported on-device speech recognition, OCR, translation, and extraction help organize the source material.
4. The healthcare worker reviews and edits the resulting case file before it becomes part of the patient history.
5. The local history can be searched and relevant context can be used to prepare a draft clinical summary.
6. When the device reconnects, pending changes are synchronized. Conflicts are shown for explicit resolution rather than silently overwriting either version.

## Proposed architecture

The problem statement suggests the following components. These are candidate technologies, not mandatory implementation choices:

| Area | Proposed approach |
|---|---|
| Offline application | Progressive Web App, service workers, and IndexedDB; SQLite is a mobile alternative |
| Speech transcription | Whisper.cpp for local speech recognition |
| Document processing | OCR for scanned medical documents |
| Structured extraction | Quantized on-device language model |
| History retrieval | Local search and a retrieval-augmented generation (RAG) pipeline |
| Synchronization API | Authenticated FastAPI or Node.js service |
| Central storage | PostgreSQL |
| Security and auditing | Encryption, audit logs, version tracking, and an explicit conflict-resolution workflow |

Keep the local storage, on-device processing, and synchronization components separable so the app remains useful when the backend or network is unavailable.

## Synchronization requirements

Synchronization is the primary engineering deliverable. The implementation should:

- Assign each queued operation a unique identifier so retries do not duplicate updates.
- Track record versions so concurrent edits can be detected.
- Preserve pending offline changes across application restarts.
- Retry interrupted operations safely.
- Detect and clearly present conflicting changes.
- Require an explicit, auditable conflict resolution instead of silently discarding data.
- Report synchronization state and errors to the user.

## Privacy and clinical safety

- Prefer local processing and storage when possible.
- Protect patient data in transit and at rest; do not treat browser storage alone as encryption.
- Require appropriate authentication and access controls before using real patient information.
- Keep AI-generated content editable and clearly marked for clinician verification.
- Do not present generated summaries as diagnoses or replace professional judgment.
- Use fictional or properly de-identified information during development and demonstrations.
- Do not include real patient records, credentials, or secrets in source control, logs, or sample data.

## Evaluation focus

The expected outcome is evaluated around:

- Offline usability and continued operation during network interruption.
- Extraction accuracy for supported inputs.
- Synchronization reliability, including safe retries.
- Conflict handling and preservation of concurrent changes.
- Data integrity.
- Performance on resource-constrained devices.

## Development status and next steps

This repository currently provides the PS-04 statement in [`../PS04.md`](../PS04.md). Start implementation by establishing a small offline workflow, then add reliable synchronization and conflict handling before integrating heavier on-device AI components. Record the chosen stack and provide setup, run, and test instructions as the application is built.

## Scope not yet specified

The problem statement does not define a required programming language, exact case-file schema, supported languages or document formats, specific encryption protocol, deployment environment, submission URL, or deadline. Confirm any organizer-provided requirements before treating these as final design decisions.
