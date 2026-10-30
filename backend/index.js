require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
connectDB();
const app = express();

app.listen(3000, (err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("server is running on 3000");
  }
});
