
import axios from "axios";
import { db } from "./localDB";
import { generateUUID } from "./generateUUID";

const apiUrl = import.meta.env.VITE_API_URL;

let syncInProgress = false;

export const syncPendingPatients = async () => {
  if (syncInProgress || !navigator.onLine) {
    return;
  }

  if (!apiUrl) {
    console.error("VITE_API_URL is not configured.");
    return;
  }

  syncInProgress = true;

  let syncedCount = 0;

  try {
    await syncNewPatients(
      (count) => {
        syncedCount += count;
      }
    );

    if (navigator.onLine) {
      await syncUpdatedPatients(
        (count) => {
          syncedCount += count;
        }
      );
    }

    if (navigator.onLine) {
      await syncDeletedPatients(
        (count) => {
          syncedCount += count;
        }
      );
    }
  } catch (error) {
    console.error(
      "Patient synchronization failed:",
      error.response?.data || error.message
    );
  } finally {
    syncInProgress = false;
  }

  if (syncedCount > 0) {
    console.log(
      `${syncedCount} patient operation(s) synchronized successfully.`
    );

    window.dispatchEvent(new Event("patients-synced"));
    window.dispatchEvent(new Event("patients-updated"));
  }
};

const syncNewPatients = async (onSynced) => {
  const pendingPatients = await db.patients
    .filter(
      (patient) =>
        patient.syncStatus === "pending" &&
        !patient.isArchived &&
        !patient.archived
    )
    .toArray();

  for (const localPatient of pendingPatients) {
    if (!navigator.onLine) {
      break;
    }

    try {
      const syncId = localPatient.syncId || generateUUID();

      await db.patients.update(String(localPatient._id), {
        syncId,
      });

      const patientData = {
        syncId,
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
          timeout: 15000,
          withCredentials: true,
        }
      );

      const serverPatient = response.data?.patient;

      if (!serverPatient?._id) {
        throw new Error(
          "The server did not return the saved patient's MongoDB ID."
        );
      }

      await db.transaction(
        "rw",
        db.patients,
        db.idMappings,
        async () => {
          await db.patients.delete(String(localPatient._id));

          await db.patients.put({
            ...serverPatient,
            _id: String(serverPatient._id),
            syncId,
            syncStatus: "synced",
            isPending: false,
            isArchived: false,
            archived: false,
          });

          await db.idMappings.put({
            localId: String(localPatient._id),
            serverId: String(serverPatient._id),
          });
        }
      );

      onSynced(1);

      console.log(
        `Patient synchronized: ${serverPatient.firstName} ${serverPatient.lastName}`
      );
    } catch (error) {
      console.error(
        `Failed to sync patient ${localPatient._id}:`,
        error.response?.data || error.message
      );
    }
  }
};

const syncUpdatedPatients = async (onSynced) => {
  const updatedPatients = await db.patients
    .filter(
      (patient) =>
        patient.syncStatus === "pending-update" ||
        (patient.syncStatus === "pending" &&
          !String(patient._id).startsWith("local-") &&
          patient.isPending === true)
    )
    .toArray();

  for (const localPatient of updatedPatients) {
    if (!navigator.onLine) {
      break;
    }

    try {
      const patientId = String(localPatient._id);

      if (!patientId || patientId.startsWith("local-")) {
        console.warn(
          "Cannot update a patient without a server ID:",
          patientId
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
        `${apiUrl}/edit/patient/${patientId}`,
        patientData,
        {
          timeout: 15000,
          withCredentials: true,
        }
      );

      const serverPatient =
        response.data?.patient ||
        response.data?.data?.patient ||
        response.data?.data ||
        response.data;

      if (
        !serverPatient ||
        (serverPatient._id &&
          String(serverPatient._id) !== patientId)
      ) {
        throw new Error(
          "The server returned an invalid patient update response."
        );
      }

      await db.patients.put({
        ...localPatient,
        ...serverPatient,
        _id: patientId,
        syncStatus: "synced",
        isPending: false,
      });

      onSynced(1);

      console.log(
        `Patient update synchronized: ${localPatient.firstName} ${localPatient.lastName}`
      );
    } catch (error) {
      console.error(
        `Failed to sync patient update ${localPatient._id}:`,
        error.response?.data || error.message
      );
    }
  }
};

const syncDeletedPatients = async (onSynced) => {
  const pendingDeletes = await db.syncQueue
    .where("status")
    .equals("pending")
    .filter(
      (operation) =>
        operation.entityType?.toLowerCase() === "patient" &&
        operation.action?.toLowerCase() === "delete"
    )
    .toArray();

  for (const operation of pendingDeletes) {
    if (!navigator.onLine) {
      break;
    }

    try {
      const patientId = String(
        operation.entityId || operation.localId || ""
      );

      if (!patientId || patientId.startsWith("local-")) {
        await db.syncQueue.delete(operation.id);
        continue;
      }

      await axios.delete(
        `${apiUrl}/delete/patient/${patientId}`,
        {
          timeout: 15000,
          withCredentials: true,
        }
      );

      await db.transaction(
        "rw",
        db.patients,
        db.syncQueue,
        async () => {
          await db.patients.delete(patientId);
          await db.syncQueue.delete(operation.id);
        }
      );

      onSynced(1);

      console.log(`Patient deletion synchronized: ${patientId}`);
    } catch (error) {
      console.error(
        `Failed to sync patient deletion ${operation.entityId}:`,
        error.response?.data || error.message
      );
    }
  }
};

export const registerPatientSyncListeners = () => {
  const handleOnline = () => {
    syncPendingPatients();
  };

  window.addEventListener("online", handleOnline);

  return () => {
    window.removeEventListener("online", handleOnline);
  };
};
