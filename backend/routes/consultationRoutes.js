
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createConsultation,
  syncConsultation,
  getAllConsultations,
  getPatientConsultations,
  getConsultationById,
  updateConsultation,
  reviewAiDraft,
  deleteConsultation,
  generateClinicalDraft,
} = require("../controllers/consultationController");

// Protect every consultation and AI endpoint.
router.use(authMiddleware);

// ============================================
// AI CLINICAL DRAFT
// POST /ai/clinical-draft
// ============================================

router.post("/ai/clinical-draft", generateClinicalDraft);

// ============================================
// CONSULTATION DASHBOARD
// GET /consultations
// ============================================

router.get("/consultations", getAllConsultations);

// ============================================
// CREATE AND SYNCHRONIZE
// ============================================

router.post("/consultations", createConsultation);

router.post("/consultations/sync", syncConsultation);

// ============================================
// PATIENT CONSULTATION HISTORY
// GET /patients/:patientId/consultations
// ============================================

router.get(
  "/patients/:patientId/consultations",
  getPatientConsultations
);

// ============================================
// INDIVIDUAL CONSULTATION
// ============================================

router.get("/consultations/:id", getConsultationById);

router.put("/consultations/:id", updateConsultation);

router.patch(
  "/consultations/:id/review",
  reviewAiDraft
);

router.delete("/consultations/:id", deleteConsultation);

module.exports = router;
