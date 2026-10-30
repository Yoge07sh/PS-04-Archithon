import Dexie from "dexie";

export const db = new Dexie("MediSyncDB");

db.version(1).stores({
  patients: "&_id, patientCode, firstName, lastName, contactNumber, isArchived",
});
