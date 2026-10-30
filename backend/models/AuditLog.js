import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    entityType: {
      type: String,
      enum: ["user", "patient", "consultation", "sync", "authentication"],
      required: true,
    },

    entityId: {
      type: String,
      default: null,
    },

    outcome: {
      type: String,
      enum: ["success", "failure"],
      required: true,
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

auditLogSchema.index({
  actorId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  entityType: 1,
  entityId: 1,
  createdAt: -1,
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
