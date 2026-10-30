const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const patientController = require("../controllers/patientController");

router.post("/add/patient", authMiddleware, (req, res) => {
  patientController.addPatient(req, res);
});

router.get("/patients", authMiddleware, (req, res) => {
  patientController.getPatients(req, res);
});

router.get("/get/patientforEdit/:id", authMiddleware, (req, res) => {
  patientController.getPatientForEdit(req, res);
});

router.delete("/delete-patient/:id", authMiddleware, (req, res) => {
  patientController.deletePatient(req, res);
});

router.put("/edit/patient/:id", authMiddleware, (req, res) => {
  patientController.editPatientById(req, res);
});
module.exports = router;
