import { useEffect } from "react";
import { syncPendingPatients } from "../db/patientSync";

export const usePatientSync = () => {
  useEffect(() => {
    const handleOnline = () => {
      syncPendingPatients().catch((error) => {
        console.error("Patient synchronization failed:", error);
      });
    };

    // Try syncing when the application starts.
    handleOnline();

    // Retry when the browser reports that connectivity has returned.
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);
};
