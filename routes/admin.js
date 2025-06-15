const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");
require("dotenv").config();

const router = express.Router();

// Admin login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ message: "Username va parol kiritish shart!" });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: "Noto'g'ri username yoki parol!" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Noto'g'ri username yoki parol!" });
    }

    const token = jwt.sign({ id: admin._id, username: admin.username }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ token, message: "Muvaffaqiyatli kirish!" });
    console.log("Admin kirdi:", { username });
  } catch (error) {
    console.error("Admin kirishda xato:", error.message, error.stack);
    res.status(500).json({ message: "Kirishda xato yuz berdi!" });
  }
});

module.exports = router;