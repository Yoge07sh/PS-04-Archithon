import { db } from "./localDB";

// Save patients fetched from the backend
export const savePatientsLocally = async (patients) => {
  if (!Array.isArray(patients)) {
    throw new Error("Patient data must be an array.");
  }

  await db.transaction("rw", db.patients, async () => {
    await db.patients.bulkPut(
      patients
        .filter((patient) => patient?._id)
        .map((patient) => ({
          ...patient,
          _id: String(patient._id),
        })),
    );
  });
};

// Retrieve patients saved locally
export const getLocalPatients = async () => {
  return db.patients.filter((patient) => patient.isArchived !== true).toArray();
};

// Remove an archived patient from local storage
export const removeLocalPatient = async (patientId) => {
  await db.patients.delete(String(patientId));
};

export const addPatientLocally = async (patientData) => {
  const localId = `local-${crypto.randomUUID()}`;
  const syncId = crypto.randomUUID();

  const newPatient = {
    ...patientData,
    _id: localId,
    syncId,
    syncStatus: "pending",
    createdAt: new Date().toISOString(),
  };

  await db.patients.add(newPatient);

  return newPatient;
};
export const updatePatientLocally = async (patientId, patientData) => {
  const existingPatient = await db.patients.get(String(patientId));

  if (!existingPatient) {
    throw new Error(
      "Patient is not available locally. Connect to the internet and try again.",
    );
  }

  const syncStatus =
    existingPatient.syncStatus === "pending" ? "pending" : "pending-update";

  const updatedPatient = {
    ...existingPatient,
    ...patientData,
    _id: String(existingPatient._id),
    syncStatus,
    updatedAt: new Date().toISOString(),
  };

  await db.patients.put(updatedPatient);

  return updatedPatient;
};