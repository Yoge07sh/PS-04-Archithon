const Patient = require("../models/Patient");

const addPatient = async (req, res) => {
  try {
    const patientData = {
      ...req.body,
      gender: req.body.gender?.trim().toLowerCase(),
      createdBy: req.user.id,
    };

    const patient = new Patient(patientData);
    await patient.save();

    await patient.save();

    return res.status(201).json({
      success: true,
      message: "Patient added successfully!",
      patient,
    });
  } catch (err) {
    console.error("Add patient error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getPatients = async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const search = (req.query.search || "").trim();

    // Exclude archived patients
    const filter = {
      isArchived: false,
    };

    // Apply search when a search term is provided
    if (search) {
      // Escape special regex characters
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        {
          firstName: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          lastName: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          contactNumber: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          address: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          patientCode: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
      ];
    }

    const patients = await Patient.find(filter)
      .select(
        "patientCode firstName lastName dateOfBirth gender contactNumber address",
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      totalPatients,
      data: patients,
    });
  } catch (err) {
    console.error("Get patients error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findByIdAndUpdate(
      id,
      { isArchived: true },
      { new: true, runValidators: true },
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Patient deleted successfully.",
    });
  } catch (err) {
    console.error("Delete patient error:", err);

    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const editPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, dateOfBirth, gender, contactNumber, address } =
      req.body;

    const patient = await Patient.findOneAndUpdate(
      { _id: id, isArchived: false },
      {
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || undefined,
        gender,
        contactNumber,
        address,
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Patient updated successfully.",
      patient,
    });
  } catch (err) {
    console.error("Edit patient error:", err);

    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID.",
      });
    }

    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const getPatientForEdit = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findOne({
      _id: id,
      isArchived: false,
    }).select(
      "patientCode firstName lastName dateOfBirth gender contactNumber address",
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found.",
      });
    }

    return res.status(200).json({
      success: true,
      patient,
    });
  } catch (err) {
    console.error("Get patient for edit error:", err);

    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const syncOfflinePatient = async (req, res) => {
  try {
    const {
      syncId,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      contactNumber,
      address,
    } = req.body;

    if (!syncId || !firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "syncId, firstName, and lastName are required.",
      });
    }

    // Check whether this offline patient was already synchronized.
    const existingPatient = await Patient.findOne({
      syncId,
      createdBy: req.user.id,
    });

    if (existingPatient) {
      return res.status(200).json({
        success: true,
        message: "Patient was already synchronized.",
        patient: existingPatient,
      });
    }

    const patient = await Patient.create({
      syncId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dateOfBirth || undefined,
      gender: gender?.trim().toLowerCase() || "undisclosed",
      contactNumber: contactNumber?.trim() || "",
      address: address?.trim() || "",
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Offline patient synchronized successfully.",
      patient,
    });
  } catch (err) {
    // A concurrent retry may have created the same syncId.
    if (err.code === 11000 && req.body.syncId) {
      try {
        const existingPatient = await Patient.findOne({
          syncId: req.body.syncId,
          createdBy: req.user.id,
        });

        if (existingPatient) {
          return res.status(200).json({
            success: true,
            message: "Patient was already synchronized.",
            patient: existingPatient,
          });
        }
      } catch (lookupError) {
        console.error("Sync duplicate lookup error:", lookupError);
      }
    }

    console.error("Offline patient sync error:", err);

    return res.status(500).json({
      success: false,
      message: "Unable to synchronize patient.",
    });
  }
};

// top recently patient

const getRecentPatients = async (req, res) => {
  try {
    const recentPatients = await Patient.find({
      isArchived: false,
    })
      .select(
        "patientCode firstName lastName dateOfBirth gender contactNumber address createdAt",
      )
      .sort({ createdAt: -1 })
      .limit(4);

    return res.status(200).json({
      success: true,
      data: recentPatients,
    });
  } catch (err) {
    console.error("Get recent patients error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  addPatient,
  getPatients,
  deletePatient,
  editPatientById,
  getPatientForEdit,
  syncOfflinePatient,
  getRecentPatients,
};
