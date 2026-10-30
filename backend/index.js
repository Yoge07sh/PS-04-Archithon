require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

const connectDB = require("./config/db");
const createAdmin = require("./createAdmin");

const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// Database and admin initialization
connectDB();
createAdmin();

// Routes
app.use(authRoutes);
app.use(patientRoutes);

app.listen(3000, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("Server is running on port 3000");
  }
});
