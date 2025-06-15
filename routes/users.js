const express = require("express");
const User = require("../models/user");

const router = express.Router();

// Foydalanuvchi ID va push tokenini saqlash
router.post("/userId", async (req, res) => {
  const { userId, pushToken } = req.body;
  console.log("POST /userId request:", { userId, pushToken });
  try {
    if (!userId) {
      console.warn("userId kiritilmagan:", req.body);
      return res.status(400).json({ message: "userId kiritish shart!" });
    }
    const existingUser = await User.findOne({ userId });
    if (!existingUser) {
      const newUser = new User({
        userId,
        currentIndex: 0,
        pressCount: 0,
        lastActive: new Date(),
        pushToken,
        yellowTextIndex: 0,
        greenTextIndex: 0,
      });
      await newUser.save();
      console.log("Yangi foydalanuvchi qo'shildi:", { userId, pushToken });
    } else if (pushToken) {
      existingUser.pushToken = pushToken;
      existingUser.lastActive = new Date();
      await existingUser.save();
      console.log("Push token yangilandi:", { userId, pushToken });
    }
    res.status(200).json({ message: "Foydalanuvchi saqlandi!" });
  } catch (error) {
    console.error("Foydalanuvchi qo'shishda xato:", error.message, error.stack, { userId, pushToken });
    res.status(500).json({ message: "Foydalanuvchi qo'shishda xato yuz berdi!", error: error.message });
  }
});

// Foydalanuvchi faoliyatini yangilash
router.post("/user-activity", async (req, res) => {
  const { userId } = req.body;
  console.log("POST /user-activity request:", { userId });
  try {
    if (!userId) {
      console.warn("userId kiritilmagan:", req.body);
      return res.status(400).json({ message: "userId kiritish shart!" });
    }
    await User.findOneAndUpdate(
      { userId },
      { lastActive: new Date() },
      { upsert: false }
    );
    res.status(200).json({ message: "Faoliyat yangilandi!" });
    console.log("Foydalanuvchi faoliyati saqlandi:", { userId });
  } catch (error) {
    console.error("Faoliyat yangilashda xato:", error.message, error.stack);
    res.status(500).json({ message: "Faoliyat yangilashda xato yuz berdi!" });
  }
});

// Foydalanuvchi holatini saqlash
router.post("/user-state", async (req, res) => {
  const { userId, currentIndex, pressCount, yellowTextIndex, greenTextIndex } = req.body;
  try {
    console.log("POST /user-state:", { userId, currentIndex, pressCount, yellowTextIndex, greenTextIndex });
    if (!userId || currentIndex === undefined || pressCount === undefined) {
      console.warn("Invalid user-state data:", req.body);
      return res.status(400).json({ message: "Barcha maydonlarni to'ldiring!" });
    }
    await User.findOneAndUpdate(
      { userId },
      { currentIndex, pressCount, yellowTextIndex, greenTextIndex, lastActive: new Date() },
      { upsert: true }
    );
    console.log("Foydalanuvchi holati saqlandi:", { userId, currentIndex, pressCount, yellowTextIndex, greenTextIndex });
    res.status(200).json({ message: "Foydalanuvchi holati saqlandi!" });
  } catch (error) {
    console.error("Foydalanuvchi holati saqlashda xato:", error.message, error.stack);
    res.status(500).json({ message: "Foydalanuvchi holati saqlashda xato yuz berdi!" });
  }
});

// Foydalanuvchi holatini olish
router.get("/user-state/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const userState = await User.findOne({ userId });
    if (userState) {
      res.status(200).json(userState);
      console.log("Foydalanuvchi holati olingan:", { userId });
    } else {
      res.status(404).json({ message: "Foydalanuvchi topilmadi!" });
    }
  } catch (error) {
    console.error("Foydalanuvchi holati olishda xato:", error.message, error.stack);
    res.status(500).json({ message: "Foydalanuvchi holati olishda xato yuz berdi!" });
  }
});

module.exports = router;