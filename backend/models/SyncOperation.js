const mongoose = require("mongoose");

const syncOperationSchema = new mongoose.Schema(
  {
    operationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
 
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    deviceId: {
      type: String,
      required: true,
      trim: true,
    },

    entityType: {
      type: String,
      enum: ["patient", "consultation"],
      required: true,
    },

    entityId: {
      type: String,
      required: true,
    },

    action: {
      type: String,
      enum: ["create", "update", "delete"],
      required: true,
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    expectedVersion: {
      type: Number,
      default: null,
      min: 1,
    },

    status: {
      type: String,
      enum: ["pending", "processing", "synced", "conflict", "failed"],
      default: "pending",
    }, 

    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastError: {
      type: String,
      default: null,
    },

    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

syncOperationSchema.index({
  userId: 1,
  status: 1,
  createdAt: 1,
});

const SyncOperation = mongoose.model("SyncOperation", syncOperationSchema);

module.exports = SyncOperation;
