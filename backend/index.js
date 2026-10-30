require("dotenv").config();
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const createAdmin = require("./createAdmin");
const authRoutes = require("./routes/authRoutes");
app.use(express.json());
app.use(cookieParser());
connectDB();
createAdmin();

app.use(authRoutes);

app.listen(3000, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("server is running on 3000");
  }
});
