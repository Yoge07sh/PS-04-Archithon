
import Dexie from "dexie";

export const db = new Dexie("MediSyncDB");

db.version(1).stores({
  patients:
    "&_id, patientCode, firstName, lastName, contactNumber, isArchived",
});

db.version(2).stores({
  patients:
    "&_id, patientCode, firstName, lastName, contactNumber, isArchived",

  syncQueue:
    "++id, &operationId, status, entityType, action, createdAt, localId",

  idMappings: "&localId, serverId",

  consultations:
    "&id, &syncId, patientId, serverId, syncStatus, createdAt",
});

