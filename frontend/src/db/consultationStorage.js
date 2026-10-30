
import { db } from "./localDB";
import { generateUUID } from "./generateUUID";

// Save a consultation locally
export const addConsultationLocally = async (consultationData) => {
  const {
    patientId,
    doctorId,
    symptoms = [],
    notes = "",
    transcription = "",
    aiDraft = null,
    source = "manual",
    reviewStatus = "pending",
  } = consultationData;

  // A consultation must belong to a patient
  if (!patientId) {
    throw new Error("Patient ID is required.");
  }

  // Do not create a consultation for an unsynced patient
  if (String(patientId).startsWith("local-")) {
    throw new Error(
      "Please sync the patient before creating a consultation.",
    );
  }

  const now = new Date().toISOString();

  const consultation = {
    id: `local-${generateUUID()}`,
    syncId: generateUUID(),

    patientId,
    doctorId,

    symptoms,
    notes,
    transcription,
    aiDraft,
    source,
    reviewStatus,

    serverId: null,
    syncStatus: "pending",

    createdAt: now,
    updatedAt: now,
  };

  await db.consultations.add(consultation);

  return consultation;
};

// Get consultations for a particular patient
export const getLocalConsultationsByPatient = async (patientId) => {
  if (!patientId) {
    throw new Error("Patient ID is required.");
  }

  return db.consultations
    .where("patientId")
    .equals(patientId)
    .reverse()
    .sortBy("createdAt");
};

// Get all locally stored consultations
export const getAllLocalConsultations = async () => {
  return db.consultations.toArray();
};

// Update a consultation stored locally
export const updateConsultationLocally = async (
  consultationId,
  updatedData,
) => {
  const existingConsultation = await db.consultations.get(consultationId);

  if (!existingConsultation) {
    throw new Error("Consultation not found in local database.");
  }

  const updatedConsultation = {
    ...existingConsultation,
    ...updatedData,

    // Prevent changing identifiers or synchronization metadata
    id: existingConsultation.id,
    syncId: existingConsultation.syncId,
    patientId: existingConsultation.patientId,
    serverId: existingConsultation.serverId,

    updatedAt: new Date().toISOString(),

    syncStatus: existingConsultation.serverId
      ? "pending-update"
      : "pending",
  };

  await db.consultations.put(updatedConsultation);

  return updatedConsultation;
};

// Delete a consultation stored locally
export const removeConsultationLocally = async (consultationId) => {
  const existingConsultation = await db.consultations.get(consultationId);

  if (!existingConsultation) {
    throw new Error("Consultation not found in local database.");
  }

  // Only allow deletion of consultations not yet synced
  if (existingConsultation.serverId) {
    throw new Error(
      "This consultation already exists on the server. Use a server deletion workflow.",
    );
  }

  await db.consultations.delete(consultationId);

  return {
    success: true,
    message: "Consultation deleted locally.",
  };
};
