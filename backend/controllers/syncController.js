const mongoose = require("mongoose");

const Patient = require("../models/Patient");
const Consultation = require("../models/Consultation");
const SyncOperation = require("../models/SyncOperation");

const getUserId = (req) => {
  return req.user?._id || req.user?.id || req.user?.userId || req.user?.sub;
};

const isValidId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const getAllowedFields = (payload, allowedFields) => {
  const result = {};

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      result[field] = payload[field];
    }
  });

  return result;
};

// Patient fields allowed from client
const patientFields = [
  "patientCode",
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "contactNumber",
  "address",
];

// Do not allow client to control reviewStatus/reviewedBy/reviewedAt
const consultationFields = [
  "patientId",
  "symptoms",
  "notes",
  "transcription",
  "aiDraft",
  "source",
];

const processOperation = async (operation, userId, localIdMap) => {
  const {
    operationId,
    deviceId,
    entityType,
    entityId,
    localId,
    action,
    payload = {},
    expectedVersion,
  } = operation;

  // Normalize values to lowercase
  const normalizedEntityType = String(entityType || "").toLowerCase();
  const normalizedAction = String(action || "").toLowerCase();

  if (!operationId) {
    throw new Error("operationId is required");
  }

  if (!deviceId) {
    throw new Error("deviceId is required");
  }

  if (!["patient", "consultation"].includes(normalizedEntityType)) {
    throw new Error("Invalid entityType");
  }

  if (!["create", "update", "delete"].includes(normalizedAction)) {
    throw new Error("Invalid action");
  }

  if (!entityId) {
    throw new Error("entityId is required");
  }

  // Check whether this operation was already recorded
  let log = await SyncOperation.findOne({
    userId,
    operationId,
  });

  // Idempotency: do not create the same entity again
  if (log?.status === "synced") {
    if (localId && log.resultEntityId) {
      localIdMap[localId] = String(log.resultEntityId);
    }

    return {
      operationId,
      status: "synced",
      entityId: log.resultEntityId,
      resultEntityId: log.resultEntityId,
      message: "Already synced",
    };
  }

  if (log?.status === "processing") {
    return {
      operationId,
      status: "processing",
      message: "Operation is already processing",
    };
  }

  // Create operation log
  if (!log) {
    log = new SyncOperation({
      userId,
      operationId,
      deviceId,
      entityType: normalizedEntityType,
      entityId: String(entityId),
      action: normalizedAction,
      payload,
      expectedVersion: expectedVersion ?? null,
      status: "pending",
    });
  }

  // Normalize existing logs too
  log.deviceId = deviceId;
  log.entityType = normalizedEntityType;
  log.entityId = String(entityId);
  log.action = normalizedAction;
  log.payload = payload;
  log.expectedVersion = expectedVersion ?? null;
  log.status = "processing";
  log.retryCount = (log.retryCount || 0) + 1;
  log.lastError = null;

  await log.save();

  try {
    let result;
    let resultEntityId;

    // ----------------------------------
    // PATIENT OPERATIONS
    // ----------------------------------
    if (normalizedEntityType === "patient") {
      if (normalizedAction === "create") {
        const patientData = getAllowedFields(payload, patientFields);

        result = await Patient.create({
          ...patientData,
          createdBy: userId,
        });

        resultEntityId = result._id;
      }

      if (normalizedAction === "update") {
        if (!isValidId(entityId)) {
          throw new Error("Valid patient entityId is required");
        }

        const patientData = getAllowedFields(payload, patientFields);

        const filter = {
          _id: entityId,
          createdBy: userId,
          isArchived: false,
        };

        if (expectedVersion != null) {
          filter.version = expectedVersion;
        }

        result = await Patient.findOneAndUpdate(
          filter,
          {
            $set: patientData,
            $inc: { version: 1 },
          },
          {
            new: true,
            runValidators: true,
          },
        );

        if (!result) {
          throw new Error(
            "Patient not found, access denied, or version conflict",
          );
        }

        resultEntityId = result._id;
      }

      if (normalizedAction === "delete") {
        if (!isValidId(entityId)) {
          throw new Error("Valid patient entityId is required");
        }

        const filter = {
          _id: entityId,
          createdBy: userId,
          isArchived: false,
        };

        if (expectedVersion != null) {
          filter.version = expectedVersion;
        }

        result = await Patient.findOneAndUpdate(
          filter,
          {
            $set: { isArchived: true },
            $inc: { version: 1 },
          },
          { new: true },
        );

        if (!result) {
          throw new Error(
            "Patient not found, access denied, or version conflict",
          );
        }

        resultEntityId = result._id;
      }
    }

    // ----------------------------------
    // CONSULTATION OPERATIONS
    // ----------------------------------
    if (normalizedEntityType === "consultation") {
      if (normalizedAction === "create") {
        const consultationData = getAllowedFields(payload, consultationFields);

        let patientId = consultationData.patientId;

        // Resolve local patient ID to MongoDB ID
        if (patientId && localIdMap[patientId]) {
          patientId = localIdMap[patientId];
        }

        if (!patientId || !isValidId(patientId)) {
          throw new Error("Valid patientId is required");
        }

        // Ensure this patient belongs to the authenticated user
        const patient = await Patient.findOne({
          _id: patientId,
          createdBy: userId,
          isArchived: false,
        });

        if (!patient) {
          throw new Error("Patient not found or access denied");
        }

        result = await Consultation.create({
          ...consultationData,
          patientId,
          doctorId: userId,
        });

        resultEntityId = result._id;
      }

      if (normalizedAction === "update") {
        if (!isValidId(entityId)) {
          throw new Error("Valid consultation entityId is required");
        }

        const consultationData = getAllowedFields(
          payload,
          consultationFields.filter((field) => field !== "patientId"),
        );

        const filter = {
          _id: entityId,
          doctorId: userId,
        };

        if (expectedVersion != null) {
          filter.version = expectedVersion;
        }

        result = await Consultation.findOneAndUpdate(
          filter,
          {
            $set: consultationData,
            $inc: { version: 1 },
          },
          {
            new: true,
            runValidators: true,
          },
        );

        if (!result) {
          throw new Error(
            "Consultation not found, access denied, or version conflict",
          );
        }

        resultEntityId = result._id;
      }

      if (normalizedAction === "delete") {
        if (!isValidId(entityId)) {
          throw new Error("Valid consultation entityId is required");
        }

        const filter = {
          _id: entityId,
          doctorId: userId,
        };

        if (expectedVersion != null) {
          filter.version = expectedVersion;
        }

        result = await Consultation.findOneAndDelete(filter);

        if (!result) {
          throw new Error(
            "Consultation not found, access denied, or version conflict",
          );
        }

        resultEntityId = result._id;
      }
    }

    // ----------------------------------
    // SAVE SUCCESSFUL OPERATION
    // ----------------------------------
    log.status = "synced";
    log.resultEntityId = resultEntityId;
    log.processedAt = new Date();
    log.lastError = null;

    await log.save();

    if (localId && resultEntityId) {
      localIdMap[localId] = String(resultEntityId);
    }

    return {
      operationId,
      status: "synced",
      entityId: String(resultEntityId),
      resultEntityId: String(resultEntityId),
      version: result?.version,
      message: "Operation synced successfully",
    };
  } catch (error) {
    log.status = "failed";
    log.lastError = error.message;
    log.processedAt = new Date();

    await log.save();

    return {
      operationId,
      status: "failed",
      error: error.message,
      message: error.message,
    };
  }
};

// ======================================
// POST /sync
// ======================================
const syncOperations = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId || !isValidId(userId)) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const operations = req.body.operations;

    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Operations array is required",
      });
    }

    if (operations.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Maximum 50 operations allowed per request",
      });
    }

    const results = [];
    const localIdMap = {};

    // Process sequentially so later operations can use localIdMap
    for (const operation of operations) {
      try {
        const result = await processOperation(operation, userId, localIdMap);

        results.push(result);
      } catch (error) {
        results.push({
          operationId: operation?.operationId || null,
          status: "failed",
          error: error.message,
          message: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Sync process completed",
      results,
      localIdMap,
    });
  } catch (error) {
    console.error("Sync operations error:", error);

    return res.status(500).json({
      success: false,
      message: "Sync failed",
    });
  }
};

// ======================================
// GET /sync/operations
// ======================================
const getSyncOperations = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId || !isValidId(userId)) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    const filter = { userId };

    const allowedStatuses = [
      "pending",
      "processing",
      "synced",
      "failed",
      "conflict",
    ];

    if (req.query.status && allowedStatuses.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const allowedEntities = ["patient", "consultation"];

    if (
      req.query.entityType &&
      allowedEntities.includes(String(req.query.entityType).toLowerCase())
    ) {
      filter.entityType = String(req.query.entityType).toLowerCase();
    }

    const [operations, total] = await Promise.all([
      SyncOperation.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      SyncOperation.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      operations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get sync operations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sync operations",
    });
  }
};

module.exports = {
  syncOperations,
  getSyncOperations,
};
