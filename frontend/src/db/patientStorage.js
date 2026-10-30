
import { db } from "./localDB";
import { generateUUID } from "./generateUUID";

// Save patients fetched from the backend into IndexedDB.
export const savePatientsLocally = async (patients) => {
  if (!Array.isArray(patients)) {
    throw new Error("Patients must be an array.");
  }

  if (patients.length === 0) {
    return;
  }

  const records = patients
    .filter((patient) => patient?._id)
    .map((patient) => ({
      ...patient,
      syncStatus: "synced",
    }));

  if (records.length > 0) {
    await db.patients.bulkPut(records);
  }
};

// Retrieve patients from IndexedDB, excluding archived patients.
export const getLocalPatients = async () => {
  return db.patients
    .filter((patient) => patient.archived !== true)
    .toArray();
};

// Add a new patient locally.
export const addPatientLocally = async (patientData) => {
  const localId = `local-${generateUUID()}`;
  const syncId = generateUUID();

  const newPatient = {
    ...patientData,
    _id: localId,
    syncId,
    syncStatus: "pending",
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.patients.put(newPatient);

  return newPatient;
};

// Update an existing patient locally.
export const updatePatientLocally = async (
  patientId,
  updatedData
) => {
  const existingPatient = await db.patients.get(patientId);

  if (!existingPatient) {
    throw new Error("Patient not found in local database.");
  }

  const updatedPatient = {
    ...existingPatient,
    ...updatedData,
    _id: existingPatient._id,
    updatedAt: new Date().toISOString(),
    syncStatus: String(existingPatient._id).startsWith("local-")
      ? "pending"
      : "pending-update",
  };

  await db.patients.put(updatedPatient);

  return updatedPatient;
};

// Remove a patient from IndexedDB.
export const removeLocalPatient = async (patientId) => {
  await db.patients.delete(patientId);
};
