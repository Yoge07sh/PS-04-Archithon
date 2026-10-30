const mongoose = require("mongoose");
const patientSchema = new mongoose.Schema(
  {
    syncId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    patientCode: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || value <= new Date();
        },
        message: "Date of birth cannot be in the future",
      },
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "undisclosed"],
      default: "undisclosed",
    },

    contactNumber: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

patientSchema.index({ lastName: 1, firstName: 1 });

const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;
