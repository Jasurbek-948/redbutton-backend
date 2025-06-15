const express = require("express");
const axios = require("axios");
const User = require("../models/user");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

// Statistika olish (admin only)
router.get("/", adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPresses = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$pressCount" } } },
    ]);
    const messageStats = await User.aggregate([
      { $group: { _id: "$currentIndex", pressCount: { $sum: "$pressCount" } } },
    ]);
    res.status(200).json({
      totalUsers,
      totalPresses: totalPresses[0]?.total || 0,
      messageStats,
    });
    console.log("Statistika olingan:", { totalUsers, totalPresses: totalPresses[0]?.total || 0 });
  } catch (error) {
    console.error("Statistika olishda xato:", error.message, error.stack);
    res.status(500).json({ message: "Statistika olishda xato yuz berdi!" });
  }
});

// Maxsus push xabarnoma yuborish (admin only)
router.post("/send-push", adminAuth, async (req, res) => {
  const { title, body } = req.body;
  try {
    console.log("POST /send-push:", { title, body });
    if (!title || !body) {
      return res.status(400).json({ message: "Sarlavha va matn kiritish shart!" });
    }

    const activeThreshold = new Date(Date.now() - 30 * 1000);
    const users = await User.find({
      pushToken: { $exists: true },
      lastActive: { $lt: activeThreshold },
    });
    const messages = users.map((user) => ({
      to: user.pushToken,
      sound: "default",
      title,
      body,
      data: { custom: true },
    }));

    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      await axios.post("https://exp.host/--/api/v2/push/send", chunk, {
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
      });
    }
    console.log("Maxsus push xabarnomalar yuborildi:", users.length);
    res.status(200).json({ message: "Push xabarnomalar yuborildi!" });
  } catch (error) {
    console.error("Maxsus push xabarnoma yuborishda xato:", error.message, error.stack);
    res.status(500).json({ message: "Push xabarnoma yuborishda xato yuz berdi!" });
  }
});

module.exports = router;