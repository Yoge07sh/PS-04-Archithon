const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/mediaSync2026");
    console.log("DataBase Connected Successfully");
  } catch (err) {
    console.log("err");
  }
};

module.exports = connectDB;