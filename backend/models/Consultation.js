const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema(
  {
    syncId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    symptoms: {
      type: [String],
      default: [],
    },
    ocrText: {
      type: String,
      default: "",
      maxlength: 50000,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    transcription: {
      type: String,
      default: "",
    },

    aiDraft: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    source: {
      type: String,
      enum: ["manual", "ocr", "transcription"],
      default: "manual",
    },

    reviewStatus: {
      type: String,
      enum: ["not_required", "pending", "approved", "rejected"],
      default: "pending",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    version: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  },
);

consultationSchema.index({
  patientId: 1,
  createdAt: -1,
});

consultationSchema.index({
  doctorId: 1,
  createdAt: -1,
});

const Consultation = mongoose.model("Consultation", consultationSchema);
module.exports = Consultation;
