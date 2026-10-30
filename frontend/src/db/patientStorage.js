import axios from "axios";
import { db } from "./localDB";
import { generateUUID } from "./generateUUID";

const apiUrl = import.meta.env.VITE_API_URL;

let syncInProgress = false;

export const syncPendingPatients = async () => {
  // Prevent overlapping synchronization.
  if (syncInProgress || !navigator.onLine) {
    return;
  }

  syncInProgress = true;

  let syncedCount = 0;

  try {
    // ==========================================
    // 1. Synchronize patients created offline
    // ==========================================

    const pendingPatients = await db.patients
      .filter((patient) => patient.syncStatus === "pending")
      .toArray();

    for (const localPatient of pendingPatients) {
      try {
        // Generate a syncId for older local records.
        if (!localPatient.syncId) {
          const syncId = generateUUID();

          await db.patients.update(String(localPatient._id), {
            syncId,
          });

          localPatient.syncId = syncId;
        }

        // Send only fields accepted by the backend.
        const patientData = {
          syncId: localPatient.syncId,
          firstName: localPatient.firstName,
          lastName: localPatient.lastName,
          dateOfBirth: localPatient.dateOfBirth || undefined,
          gender: localPatient.gender || "undisclosed",
          contactNumber: localPatient.contactNumber || "",
          address: localPatient.address || "",
        };

        const response = await axios.post(
          `${apiUrl}/sync/patient`,
          patientData,
          {
            withCredentials: true,
            timeout: 15000,
          },
        );

        const serverPatient = response.data?.patient;

        if (!serverPatient?._id) {
          throw new Error(
            "The server did not return the saved patient's MongoDB ID.",
          );
        }

        // Replace the temporary record with the server record.
        await db.transaction("rw", db.patients, async () => {
          await db.patients.delete(String(localPatient._id));

          await db.patients.put({
            ...serverPatient,
            _id: String(serverPatient._id),
            syncId: localPatient.syncId,
            syncStatus: "synced",
          });
        });

        syncedCount++;

        console.log(
          `Patient synchronized: ${serverPatient.firstName} ${serverPatient.lastName}`,
        );
      } catch (error) {
        // Keep the record pending so it can be retried.
        console.error(
          `Failed to sync patient ${localPatient._id}:`,
          error.response?.data || error.message,
        );
      }
    }

    // ==========================================
    // 2. Synchronize updates to existing patients
    // ==========================================

    const pendingUpdates = await db.patients
      .filter((patient) => patient.syncStatus === "pending-update")
      .toArray();

    for (const localPatient of pendingUpdates) {
      try {
        // Existing patients must have a real MongoDB ID.
        if (
          !localPatient._id ||
          String(localPatient._id).startsWith("local-")
        ) {
          console.error(
            "Cannot update patient without a server ID:",
            localPatient._id,
          );
          continue;
        }

        const patientData = {
          firstName: localPatient.firstName,
          lastName: localPatient.lastName,
          dateOfBirth: localPatient.dateOfBirth || undefined,
          gender: localPatient.gender || "undisclosed",
          contactNumber: localPatient.contactNumber || "",
          address: localPatient.address || "",
        };

        const response = await axios.put(
          `${apiUrl}/edit/patient/${localPatient._id}`,
          patientData,
          {
            withCredentials: true,
            timeout: 15000,
          },
        );

        const serverPatient =
          response.data?.patient || response.data?.data?.patient;

        // Mark the local record synced after server success.
        const updatedPatient = {
          ...localPatient,
          ...(serverPatient || {}),
          ...patientData,
          _id: String(serverPatient?._id || localPatient._id),
          syncStatus: "synced",
        };

        await db.patients.put(updatedPatient);

        syncedCount++;

        console.log(
          `Patient update synchronized: ${updatedPatient.firstName} ${updatedPatient.lastName}`,
        );
      } catch (error) {
        // Keep the update pending if synchronization fails.
        console.error(
          `Failed to synchronize patient update ${localPatient._id}:`,
          error.response?.data || error.message,
        );
      }
    }
  } catch (error) {
    console.error("Patient synchronization error:", error);
  } finally {
    syncInProgress = false;
  }

  // Notify the UI when local patient records change.
  if (syncedCount > 0) {
    console.log(
      `${syncedCount} patient operation(s) synchronized successfully.`,
    );

    window.dispatchEvent(new Event("patients-synced"));
  }
};
