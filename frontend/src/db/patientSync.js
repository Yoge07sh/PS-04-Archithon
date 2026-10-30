import axios from "axios";
import { db } from "./localDB";
import { generateUUID } from "./generateUUID";

const apiUrl = import.meta.env.VITE_API_URL;

let syncInProgress = false;

/**
 * Synchronize pending patients with the backend.
 *
 * Expected local statuses:
 * pending        -> Patient created offline
 * pending-update -> Existing patient updated offline
 * synced         -> Patient synchronized with backend
 */
export const syncPendingPatients = async () => {
  if (syncInProgress) {
    return;
  }

  if (!navigator.onLine) {
    console.log("Offline: patient synchronization skipped.");
    return;
  }

  if (!apiUrl) {
    console.error("VITE_API_URL is not configured.");
    return;
  }

  syncInProgress = true;

  try {
    await syncNewPatients();
    await syncUpdatedPatients();

    window.dispatchEvent(new Event("patients-synced"));
  } catch (error) {
    console.error(
      "Patient synchronization failed:",
      error.response?.data || error.message,
    );
  } finally {
    syncInProgress = false;
  }
};

/**
 * Sync newly created patients.
 */
const syncNewPatients = async () => {
  const pendingPatients = await db.patients
    .filter((patient) => patient.syncStatus === "pending")
    .toArray();

  for (const localPatient of pendingPatients) {
    if (!navigator.onLine) {
      break;
    }

    try {
      const syncId = localPatient.syncId || generateUUID();

      // Save syncId locally before sending the request.
      // Reuse it when retrying the same patient.
      await db.patients.update(localPatient._id, {
        syncId,
      });

      const response = await axios.post(
        `${apiUrl}/sync/patient`,
        {
          syncId,
          firstName: localPatient.firstName,
          lastName: localPatient.lastName,
          dateOfBirth: localPatient.dateOfBirth || undefined,
          gender: localPatient.gender || "undisclosed",
          contactNumber: localPatient.contactNumber || "",
          address: localPatient.address || "",
        },
        {
          timeout: 15000,
          withCredentials: true,
        },
      );

      const savedPatient = response.data?.patient;

      if (!savedPatient?._id) {
        throw new Error("Backend did not return the saved patient.");
      }

      // Replace the temporary local record with the server record.
      await db.transaction("rw", db.patients, async () => {
        await db.patients.delete(localPatient._id);

        await db.patients.put({
          ...savedPatient,
          _id: savedPatient._id,
          syncId,
          syncStatus: "synced",
        });
      });

      console.log(`Patient synchronized successfully: ${savedPatient._id}`);
    } catch (error) {
      console.error(
        `Failed to sync patient ${localPatient._id}:`,
        error.response?.data || error.message,
      );

      // Keep the record pending so it can be retried later.
    }
  }
};

/**
 * Sync patients updated while offline.
 */
const syncUpdatedPatients = async () => {
  const updatedPatients = await db.patients
    .filter((patient) => patient.syncStatus === "pending-update")
    .toArray();

  for (const localPatient of updatedPatients) {
    if (!navigator.onLine) {
      break;
    }

    try {
      if (!localPatient._id || String(localPatient._id).startsWith("local-")) {
        console.warn(
          "Skipping update: patient does not have a server ID.",
          localPatient._id,
        );

        continue;
      }

      const response = await axios.put(
        `${apiUrl}/edit/patient/${localPatient._id}`,
        {
          firstName: localPatient.firstName,
          lastName: localPatient.lastName,
          dateOfBirth: localPatient.dateOfBirth || undefined,
          gender: localPatient.gender || "undisclosed",
          contactNumber: localPatient.contactNumber || "",
          address: localPatient.address || "",
        },
        {
          timeout: 15000,
          withCredentials: true,
        },
      );

      const savedPatient =
        response.data?.patient ||
        response.data?.data?.patient ||
        response.data?.data ||
        response.data;

      if (!savedPatient?._id) {
        throw new Error("Backend did not return the updated patient.");
      }

      await db.patients.put({
        ...localPatient,
        ...savedPatient,
        _id: savedPatient._id,
        syncStatus: "synced",
      });

      console.log(`Patient update synchronized: ${savedPatient._id}`);
    } catch (error) {
      console.error(
        `Failed to sync patient update ${localPatient._id}:`,
        error.response?.data || error.message,
      );

      // Keep the record pending-update for another attempt.
    }
  }
};

/**
 * Start synchronization when connectivity returns.
 */
export const registerPatientSyncListeners = () => {
  window.addEventListener("online", syncPendingPatients);

  return () => {
    window.removeEventListener("online", syncPendingPatients);
  };
};
