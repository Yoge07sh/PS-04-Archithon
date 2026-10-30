
import { db } from "./localDB";
import { generateUUID } from "./generateUUID";

const getDeviceId = () => {
  let deviceId = localStorage.getItem("medisync-device-id");

  if (!deviceId) {
    deviceId = generateUUID();
    localStorage.setItem("medisync-device-id", deviceId);
  }

  return deviceId;
};

const dispatchQueueUpdate = () => {
  window.dispatchEvent(new Event("sync-queue-updated"));
  window.dispatchEvent(new Event("patients-updated"));
};

const createSyncOperation = ({
  localId = null,
  entityId = null,
  action,
  payload = {},
  expectedVersion = null,
}) => ({
  operationId: generateUUID(),
  deviceId: getDeviceId(),
  entityType: "patient",
  entityId: entityId || localId,
  localId,
  action: action.toLowerCase(),
  payload,
  expectedVersion,
  status: "pending",
  retryCount: 0,
  error: null,
  createdAt: new Date().toISOString(),
});

export const savePatientsLocally = async (patients) => {
  if (!Array.isArray(patients)) {
    throw new Error("Patients must be an array.");
  }

  if (patients.length === 0) {
    return;
  }

  await db.transaction("rw", db.patients, async () => {
    for (const patient of patients) {
      if (!patient?._id) continue;

      const id = String(patient._id);
      const existing = await db.patients.get(id);

      if (
        existing?.syncStatus === "pending" ||
        existing?.syncStatus === "pending-update" ||
        existing?.isPending === true
      ) {
        continue;
      }

      await db.patients.put({
        ...existing,
        ...patient,
        _id: id,
        syncStatus: "synced",
        isPending: false,
      });
    }
  });

  window.dispatchEvent(new Event("patients-updated"));
};

export const getLocalPatients = async () => {
  return db.patients
    .filter(
      (patient) =>
        patient.isArchived !== true &&
        patient.archived !== true
    )
    .toArray();
};

export const addPatientLocally = async (patientData) => {
  const localId = `local-${generateUUID()}`;
  const now = new Date().toISOString();

  const newPatient = {
    ...patientData,
    _id: localId,
    syncId: generateUUID(),
    syncStatus: "pending",
    isPending: true,
    isArchived: false,
    archived: false,
    createdAt: now,
    updatedAt: now,
  };

  const operation = createSyncOperation({
    localId,
    action: "create",
    payload: patientData,
  });

  await db.transaction(
    "rw",
    db.patients,
    db.syncQueue,
    async () => {
      await db.patients.put(newPatient);
      await db.syncQueue.add(operation);
    }
  );

  dispatchQueueUpdate();

  return newPatient;
};

export const updatePatientLocally = async (
  patientId,
  updatedData
) => {
  const id = String(patientId);
  let updatedPatient;

  await db.transaction(
    "rw",
    db.patients,
    db.syncQueue,
    async () => {
      const existingPatient = await db.patients.get(id);

      if (!existingPatient) {
        throw new Error("Patient not found in local database.");
      }

      updatedPatient = {
        ...existingPatient,
        ...updatedData,
        _id: existingPatient._id,
        updatedAt: new Date().toISOString(),
        syncStatus: "pending",
        isPending: true,
      };

      await db.patients.put(updatedPatient);

      const pendingCreate = await db.syncQueue
        .where("localId")
        .equals(id)
        .filter(
          (operation) =>
            operation.entityType?.toLowerCase() === "patient" &&
            operation.action?.toLowerCase() === "create" &&
            operation.status === "pending"
        )
        .first();

      if (pendingCreate) {
        await db.syncQueue.update(pendingCreate.id, {
          payload: {
            ...pendingCreate.payload,
            ...updatedData,
          },
        });
      } else {
        const pendingUpdate = await db.syncQueue
          .where("localId")
          .equals(id)
          .filter(
            (operation) =>
              operation.entityType?.toLowerCase() === "patient" &&
              operation.action?.toLowerCase() === "update" &&
              operation.status === "pending"
          )
          .first();

        if (pendingUpdate) {
          await db.syncQueue.update(pendingUpdate.id, {
            payload: {
              ...pendingUpdate.payload,
              ...updatedData,
            },
          });
        } else {
          await db.syncQueue.add(
            createSyncOperation({
              localId: id.startsWith("local-") ? id : null,
              entityId: id,
              action: "update",
              payload: updatedData,
              expectedVersion: existingPatient.version || 1,
            })
          );
        }
      }
    }
  );

  dispatchQueueUpdate();

  return updatedPatient;
};

export const deletePatientLocally = async (patientId) => {
  const id = String(patientId);

  await db.transaction(
    "rw",
    db.patients,
    db.syncQueue,
    async () => {
      const patient = await db.patients.get(id);

      if (!patient) return;

      if (id.startsWith("local-")) {
        await db.syncQueue
          .where("localId")
          .equals(id)
          .delete();

        await db.patients.delete(id);
      } else {
        const existingDelete = await db.syncQueue
          .where("entityId")
          .equals(id)
          .filter(
            (operation) =>
              operation.entityType?.toLowerCase() === "patient" &&
              operation.action?.toLowerCase() === "delete" &&
              operation.status === "pending"
          )
          .first();

        await db.patients.put({
          ...patient,
          isArchived: true,
          archived: true,
          syncStatus: "pending",
          isPending: true,
        });

        if (!existingDelete) {
          await db.syncQueue.add(
            createSyncOperation({
              entityId: id,
              action: "delete",
              payload: {},
              expectedVersion: patient.version || 1,
            })
          );
        }
      }
    }
  );

  dispatchQueueUpdate();
};

export const removeLocalPatient = async (patientId) => {
  await db.patients.delete(String(patientId));

  window.dispatchEvent(new Event("patients-updated"));
};
