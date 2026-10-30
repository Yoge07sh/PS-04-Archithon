import axios from "axios";
import { db } from "../db/localDB";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

let isSyncing = false;

// ---------------------------------------------
// Device ID
// ---------------------------------------------
const getDeviceId = () => {
  let deviceId = localStorage.getItem("medisync-device-id");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("medisync-device-id", deviceId);
  }

  return deviceId;
};

// ---------------------------------------------
// Helpers
// ---------------------------------------------
const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const dispatchSyncEvents = () => {
  window.dispatchEvent(new Event("sync-queue-updated"));
  window.dispatchEvent(new Event("patients-updated"));
  window.dispatchEvent(new Event("patients-synced"));
};

const getOperationsFromResponse = (data) => {
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.operations)) return data.operations;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.data?.operations)) return data.data.operations;

  return [];
};

// ---------------------------------------------
// Update local patient after successful CREATE
// ---------------------------------------------
const updateLocalPatientAfterSync = async (operation, result) => {
  const entityType = normalizeValue(operation.entityType);
  const action = normalizeValue(operation.action);

  if (entityType !== "patient" || action !== "create") {
    return;
  }

  const localId = operation.localId || operation.entityId;

  const serverId =
    result.resultEntityId ||
    result.entityId ||
    result.serverId ||
    result.patient?._id ||
    result.patientId;

  if (!localId || !serverId || localId === String(serverId)) {
    return;
  }

  const normalizedServerId = String(serverId);

  await db.transaction("rw", db.patients, db.idMappings, async () => {
    const localPatient = await db.patients.get(localId);

    if (localPatient) {
      const existingServerPatient = await db.patients.get(normalizedServerId);

      await db.patients.delete(localId);

      await db.patients.put({
        ...localPatient,
        ...existingServerPatient,
        _id: normalizedServerId,
        version:
          result.version ??
          result.patient?.version ??
          localPatient.version ??
          1,
        syncStatus: "synced",
        isPending: false,
      });
    }

    await db.idMappings.put({
      localId,
      serverId: normalizedServerId,
    });
  });
};

// ---------------------------------------------
// Update local patient after successful UPDATE
// ---------------------------------------------
const updateLocalPatientAfterUpdate = async (operation, result) => {
  if (
    normalizeValue(operation.entityType) !== "patient" ||
    normalizeValue(operation.action) !== "update"
  ) {
    return;
  }

  const patientId = String(operation.entityId);

  const serverPatient = result.patient || result.data?.patient || null;

  const localPatient = await db.patients.get(patientId);

  if (!localPatient) return;

  await db.patients.put({
    ...localPatient,
    ...(serverPatient || {}),
    _id: patientId,
    version: result.version ?? serverPatient?.version ?? localPatient.version,
    syncStatus: "synced",
    isPending: false,
  });
};

// ---------------------------------------------
// Prepare operations for backend
// ---------------------------------------------
const prepareOperations = async (queue) => {
  const operations = [];
  const deviceId = getDeviceId();

  for (const operation of queue) {
    const entityType = normalizeValue(operation.entityType);
    const action = normalizeValue(operation.action);

    const localId = operation.localId || null;
    const entityId = operation.entityId || localId;

    if (!operation.operationId) {
      await db.syncQueue.update(operation.id, {
        status: "failed",
        error: "operationId is missing",
      });
      continue;
    }

    if (!["patient", "consultation"].includes(entityType)) {
      await db.syncQueue.update(operation.id, {
        status: "failed",
        error: `Invalid entityType: ${operation.entityType}`,
      });
      continue;
    }

    if (!["create", "update", "delete"].includes(action)) {
      await db.syncQueue.update(operation.id, {
        status: "failed",
        error: `Invalid action: ${operation.action}`,
      });
      continue;
    }

    if (!entityId) {
      await db.syncQueue.update(operation.id, {
        status: "failed",
        error: "entityId is missing",
      });
      continue;
    }

    const normalizedOperation = {
      operationId: operation.operationId,
      deviceId: operation.deviceId || deviceId,
      entityType,
      entityId: String(entityId),
      localId,
      action,
      payload: operation.payload || {},
      expectedVersion: operation.expectedVersion ?? null,
    };

    // Repair old queue records without changing operationId
    await db.syncQueue.update(operation.id, {
      deviceId: normalizedOperation.deviceId,
      entityType,
      entityId: normalizedOperation.entityId,
      localId,
      action,
    });

    operations.push(normalizedOperation);
  }

  return operations;
};

// ---------------------------------------------
// Process backend results
// ---------------------------------------------
const processResults = async (queue, results) => {
  for (const result of results) {
    const operation = queue.find(
      (item) => item.operationId === result.operationId,
    );

    if (!operation) continue;

    const status = normalizeValue(result.status);

    const errorMessage = result.error || result.message || "Sync failed";

    if (status === "synced") {
      await db.syncQueue.update(operation.id, {
        status: "synced",
        error: null,
        lastError: null,
        syncedAt: new Date().toISOString(),
      });

      await updateLocalPatientAfterSync(operation, result);
      await updateLocalPatientAfterUpdate(operation, result);
    } else if (status === "conflict") {
      await db.syncQueue.update(operation.id, {
        status: "conflict",
        error: errorMessage,
        lastError: errorMessage,
      });
    } else if (status === "failed") {
      await db.syncQueue.update(operation.id, {
        status: "failed",
        retryCount: (operation.retryCount || 0) + 1,
        error: errorMessage,
        lastError: errorMessage,
      });
    } else {
      console.warn("Unknown sync result:", result);
    }
  }
};

// ---------------------------------------------
// Main sync function
// ---------------------------------------------
export const syncNow = async () => {
  if (!navigator.onLine || isSyncing) {
    return;
  }

  isSyncing = true;

  try {
    // Load pending and failed operations
    const queue = await db.syncQueue
      .where("status")
      .anyOf(["pending", "failed"])
      .sortBy("createdAt");

    if (!queue.length) {
      return;
    }

    // Prepare and normalize operations
    const operations = await prepareOperations(queue);

    if (!operations.length) {
      dispatchSyncEvents();
      return;
    }

    console.log(`Starting sync for ${operations.length} operation(s)`);

    // Send operations to backend
    const response = await axios.post(
      `${API_URL}/sync`,
      { operations },
      {
        withCredentials: true,
        timeout: 30000,
      },
    );

    const results = getOperationsFromResponse(response.data);

    if (!results.length) {
      console.warn(
        "Backend response mein operation results nahi mile:",
        response.data,
      );
      return;
    }

    // Update local queue according to backend results
    await processResults(queue, results);

    dispatchSyncEvents();

    console.log(`${results.length} operation(s) processed by sync server`);
  } catch (error) {
    console.error("Sync failed:", error);

    if (!error.response) {
      console.warn("Server unavailable. Operations local queue mein rahengi.");
    } else {
      console.error("Backend sync error:", error.response.data);
    }
  } finally {
    isSyncing = false;
  }
};

// ---------------------------------------------
// Initialize sync manager
// ---------------------------------------------
export const initializeSyncManager = () => {
  const handleOnline = () => {
    syncNow();
  };

  const handleQueueUpdate = () => {
    if (navigator.onLine) {
      syncNow();
    }
  };

  window.addEventListener("online", handleOnline);

  window.addEventListener("sync-queue-updated", handleQueueUpdate);

  // Initial sync when app starts
  if (navigator.onLine) {
    syncNow();
  }

  // Cleanup listeners
  return () => {
    window.removeEventListener("online", handleOnline);

    window.removeEventListener("sync-queue-updated", handleQueueUpdate);
  };
};
