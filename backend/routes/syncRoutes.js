const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  syncOperations,
  getSyncOperations,
} = require("../controllers/syncController");

router.post("/sync", authMiddleware, syncOperations);

router.get("/sync/operations", authMiddleware, getSyncOperations);

module.exports = router;
