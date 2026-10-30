
import axios from "axios";
import { db } from "./localDB";

const apiUrl = import.meta.env.VITE_API_URL;

let syncInProgress = false;

// Synchronize pending consultations with the backend
export const syncPendingConsultations = async () => {
  if (syncInProgress) return;

  if (!navigator.onLine) {
    console.log("Offline: consultation synchronization skipped.");
    return;
  }

  if (!apiUrl) {
    console.error("VITE_API_URL is not configured.");
    return;
  }

  syncInProgress = true;

  try {
    await syncNewConsultations();
    await syncUpdatedConsultations();

    window.dispatchEvent(new CustomEvent("consultations-synced"));
  } catch (error) {
    console.error("Consultation synchronization failed:", error);
  } finally {
    syncInProgress = false;
  }
};

// Synchronize newly created consultations
const syncNewConsultations = async () => {
  const pendingConsultations = await db.consultations
    .where("syncStatus")
    .equals("pending")
    .toArray();

  for (const consultation of pendingConsultations) {
    // A consultation must reference a server-side patient ID.
    if (
      !consultation.patientId ||
      String(consultation.patientId).startsWith("local-")
    ) {
      console.warn(
        "Skipping consultation until its patient is synchronized:",
        consultation.id,
      );
      continue;
    }

    try {
      const response = await axios.post(
        `${apiUrl}/consultations/sync`,
        {
          syncId: consultation.syncId,
          patientId: consultation.patientId,
          symptoms: consultation.symptoms,
          notes: consultation.notes,
          transcription: consultation.transcription,
          aiDraft: consultation.aiDraft,
          source: consultation.source,
          reviewStatus: consultation.reviewStatus,
        },
        {
          withCredentials: true,
          timeout: 15000,
        },
      );

      const serverConsultation =
        response.data?.consultation || response.data?.data?.consultation;

      if (!serverConsultation?._id) {
        throw new Error(
          "Backend response does not contain a consultation ID.",
        );
      }

      await db.transaction("rw", db.consultations, async () => {
        const current = await db.consultations.get(consultation.id);

        // Do not overwrite a record that has been removed locally.
        if (!current) return;

        await db.consultations.put({
          ...current,
          serverId: serverConsultation._id,
          syncStatus: "synced",
          updatedAt: new Date().toISOString(),
        });
      });

      console.log("Consultation synchronized:", consultation.id);
    } catch (error) {
      console.error(
        `Failed to sync consultation ${consultation.id}:`,
        error.response?.data || error.message,
      );

      // Leave the record pending so it can be retried.
    }
  }
};

// Synchronize changes to existing server consultations
const syncUpdatedConsultations = async () => {
  const pendingUpdates = await db.consultations
    .where("syncStatus")
    .equals("pending-update")
    .toArray();

  for (const consultation of pendingUpdates) {
    if (!consultation.serverId) continue;

    try {
      const response = await axios.put(
        `${apiUrl}/consultations/${consultation.serverId}`,
        {
          symptoms: consultation.symptoms,
          notes: consultation.notes,
          transcription: consultation.transcription,
          aiDraft: consultation.aiDraft,
          source: consultation.source,
        },
        {
          withCredentials: true,
          timeout: 15000,
        },
      );

      if (response.status >= 200 && response.status < 300) {
        await db.transaction("rw", db.consultations, async () => {
          const current = await db.consultations.get(consultation.id);

          if (!current) return;

          // Avoid marking a newer local edit as synchronized.
          if (current.updatedAt !== consultation.updatedAt) return;

          await db.consultations.put({
            ...current,
            syncStatus: "synced",
          });
        });

        console.log("Consultation update synchronized:", consultation.id);
      }
    } catch (error) {
      console.error(
        `Failed to update consultation ${consultation.id}:`,
        error.response?.data || error.message,
      );

      // Leave the update pending for a future retry.
    }
  }
};

// Register automatic synchronization when internet returns
export const registerConsultationSyncListeners = () => {
  const handleOnline = () => {
    syncPendingConsultations();
  };

  window.addEventListener("online", handleOnline);

  // Also attempt synchronization when the app initializes.
  if (navigator.onLine) {
    syncPendingConsultations();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
  };
};