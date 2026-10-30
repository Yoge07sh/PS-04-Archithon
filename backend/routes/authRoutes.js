const express = require("express");
const authController = require("../controllers/authController");
const router = express.Router();

router.post("/register", (req, res) => {
  authController.doRegister(req, res);
});

router.post("/login", (req, res) => {
  authController.doLogin(req, res);
});

router.post("/logout", (req, res) => {
  authController.doLogout(req, res);
});

module.exports = router;
