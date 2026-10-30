const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const doRegister = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const existingUser = await User.findOne({ email: email });
    if (existingUser) {
      return res
        .status(401)
        .json({ message: "user is already Registered with this account" });
    } else {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const userData = {
        ...req.body,
        password: hashedPassword,
      };
      const user = new User(userData);
      await user.save();
      res.status(200).json({ message: "user registered successfully" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err });
  }
};

const doLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    })

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account is inactive",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const doLogout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({
      message: "Logout successful",
    });
  } catch (err) {
    console.error("Logout error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  doRegister,
  doLogin,
  doLogout,
};
