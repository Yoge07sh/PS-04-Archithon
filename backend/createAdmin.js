const User = require("./models/User");
const bcrypt = require("bcrypt");

async function createAdmin() {
  try {
    const adminExists = await User.findOne({
      email: "admin@123gmail.com",
    });

    if (adminExists) {
      console.log("Admin already exists...");
      return;
    }

    const encryptedPassword = await bcrypt.hash("123456", 10);

    const admin = new User({
      firstName: "MediSync",
      lastName: "Admin",
      email: "admin@123gmail.com",
      password: encryptedPassword,
      role: "admin",
      isActive: "true",
    });

    await admin.save();

    console.log("Admin created successfully...");
  } catch (error) {
    console.log(error);
  }
}

module.exports = createAdmin;
