const express = require("express");
const axios = require("axios");
const Message = require("../models/message");
const User = require("../models/user");

const router = express.Router();

// Barcha xabarlarni olish
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find().sort({ id: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error("Xabarlarni olishda xato:", error.message, error.stack);
    res.status(500).json({ message: "Xabarlarni olishda xato yuz berdi!" });
  }
});

// Yangi xabar qo'shish va push xabarnoma yuborish
router.post("/", async (req, res) => {
  const { text, buttonSize, showYellowButton, showRedButton, showGreenButton, buttonCount, yellowButtonText, yellowButtonTexts, greenButtonTexts } = req.body;
  try {
    if (!text) {
      return res.status(400).json({ message: "Matn kiritish shart!" });
    }
    const messagesCount = await Message.countDocuments();
    const newMessage = new Message({
      id: messagesCount + 1,
      text,
      maxPressCount: 0,
      buttonSize: buttonSize || 130,
      showYellowButton: showYellowButton || false,
      showRedButton: showRedButton !== undefined ? showRedButton : true,
      showGreenButton: showGreenButton || false,
      buttonCount: buttonCount || 1,
      yellowButtonText: yellowButtonText || "Sariq Personaj!",
      yellowButtonTexts: yellowButtonTexts || [],
      greenButtonTexts: greenButtonTexts || [],
      specialTexts: [],
    });
    await newMessage.save();
    console.log("Yangi xabar qo'shildi:", newMessage);

    // Push xabarnoma yuborish
    try {
      const activeThreshold = new Date(Date.now() - 30 * 1000);
      const users = await User.find({
        pushToken: { $exists: true },
        lastActive: { $lt: activeThreshold },
      });
      const messages = users.map((user) => ({
        to: user.pushToken,
        sound: "default",
        title: "Yangi Xabar! 😜",
        body: `Qizil Tugma'da yangi xabar: ${text}`,
        data: { messageId: newMessage.id },
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
      console.log("Push xabarnomalar yuborildi:", users.length);
    } catch (error) {
      console.error("Push xabarnoma yuborishda xato:", error.message, error.stack);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Xabar qo'shishda xato:", error.message, error.stack);
    res.status(500).json({ message: "Xabar qo'shishda xato yuz berdi!" });
  }
});

// Yagona xabarni olish
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const message = await Message.findOne({ id: parseInt(id) });
    if (message) {
      res.status(200).json(message);
    } else {
      res.status(404).json({ message: "Xabar topilmadi!" });
    }
  } catch (error) {
    console.error("Xabar olishda xato:", error.message, error.stack);
    res.status(500).json({ message: "Xabar olishda xato yuz berdi!" });
  }
});

// Maxsus matn qo'shish
router.post("/:id/specialText", async (req, res) => {
  const { id } = req.params;
  const { specialText, startCount, endCount } = req.body;

  try {
    const message = await Message.findOne({ id: parseInt(id) });

    if (message) {
      if (!specialText || startCount === undefined || endCount === undefined) {
        return res.status(400).json({ message: "Barcha maydonlarni to'ldiring!" });
      }

      const specialTextId = message.specialTexts.length + 1;

      message.specialTexts.push({
        id: specialTextId,
        text: specialText,
        startCount: parseInt(startCount) || 0,
        endCount: parseInt(endCount) || 0,
      });

      await message.save();
      res.status(200).json(message);
      console.log("Maxsus matn qo'shildi:", { id, specialText });
    } else {
      res.status(404).json({ message: "Xabar topilmadi!" });
    }
  } catch (error) {
    console.error("Maxsus matn qo'shishda xato:", error.message, error.stack);
    res.status(500).json({ message: "Maxsus matn qo'shishda xato yuz berdi!" });
  }
});

// Maxsus matn yangilash
router.put("/:id/specialText/:specialTextId", async (req, res) => {
  const { id, specialTextId } = req.params;
  const { startCount, endCount, specialText } = req.body;

  try {
    const message = await Message.findOne({ id: parseInt(id) });

    if (message) {
      const specialTextObj = message.specialTexts.find(
        (text) => text.id === parseInt(specialTextId)
      );
      if (specialTextObj) {
        if (specialText) specialTextObj.text = specialText;
        if (startCount !== undefined) specialTextObj.startCount = parseInt(startCount);
        if (endCount !== undefined) specialTextObj.endCount = parseInt(endCount);
        await message.save();
        res.status(200).json(message);
        console.log("Maxsus matn yangilandi:", { id, specialTextId });
      } else {
        res.status(404).json({ message: "Maxsus matn topilmadi!" });
      }
    } else {
      res.status(404).json({ message: "Xabar topilmadi!" });
    }
  } catch (error) {
    console.error("Maxsus matn yangilashda xato:", error.message, error.stack);
    res.status(500).json({ message: "Maxsus matn yangilashda xato yuz berdi!" });
  }
});

// Maxsus matn o'chirish
router.delete("/:id/specialText/:specialTextId", async (req, res) => {
  const { id, specialTextId } = req.params;

  try {
    const message = await Message.findOne({ id: parseInt(id) });

    if (message) {
      const specialTextIndex = message.specialTexts.findIndex(
        (text) => text.id === parseInt(specialTextId)
      );
      if (specialTextIndex !== -1) {
        message.specialTexts.splice(specialTextIndex, 1);
        message.specialTexts.forEach((text, index) => {
          text.id = index + 1;
        });
        await message.save();
        res.status(200).json(message);
        console.log("Maxsus matn o'chirildi:", { id, specialTextId });
      } else {
        res.status(404).json({ message: "Maxsus matn topilmadi!" });
      }
    } else {
      res.status(404).json({ message: "Xabar topilmadi!" });
    }
  } catch (error) {
    console.error("Maxsus matn o'chirishda xato:", error.message, error.stack);
    res.status(500).json({ message: "Maxsus matn o'chirishda xato yuz berdi!" });
  }
});

// Xabarni yangilash
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { maxPressCount, buttonSize, showYellowButton, showRedButton, showGreenButton, buttonCount, yellowButtonText, yellowButtonTexts, greenButtonTexts } = req.body;

  try {
    const message = await Message.findOne({ id: parseInt(id) });

    if (message) {
      message.maxPressCount = parseInt(maxPressCount) || message.maxPressCount;
      message.buttonSize = parseInt(buttonSize) || message.buttonSize;
      message.showYellowButton = showYellowButton !== undefined ? showYellowButton : message.showYellowButton;
      message.showRedButton = showRedButton !== undefined ? showRedButton : message.showRedButton;
      message.showGreenButton = showGreenButton !== undefined ? showGreenButton : message.showGreenButton;
      message.buttonCount = parseInt(buttonCount) || message.buttonCount;
      message.yellowButtonText = yellowButtonText || message.yellowButtonText;
      message.yellowButtonTexts = yellowButtonTexts || message.yellowButtonTexts;
      message.greenButtonTexts = greenButtonTexts || message.greenButtonTexts;
      await message.save();
      res.status(200).json(message);
      console.log("Xabar yangilandi:", { id, maxPressCount, buttonSize, showYellowButton, showRedButton, showGreenButton, buttonCount, yellowButtonText, yellowButtonTexts, greenButtonTexts });
    } else {
      res.status(404).json({ message: "Xabar topilmadi!" });
    }
  } catch (error) {
    console.error("Xabar yangilashda xato:", error.message, error.stack);
    res.status(500).json({ message: "Xabar yangilashda xato yuz berdi!" });
  }
});

// Xabarni o'chirish
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const message = await Message.findOneAndDelete({ id: parseInt(id) });
    if (message) {
      const remainingMessages = await Message.find({ id: { $gt: parseInt(id) } }).sort({ id: 1 });
      for (let i = 0; i < remainingMessages.length; i++) {
        remainingMessages[i].id = parseInt(id) + i + 1;
        await remainingMessages[i].save();
      }
      res.status(200).json({ message: "Xabar muvaffaqiyatli o'chirildi!" });
      console.log("Xabar o'chirildi:", { id });
    } else {
      res.status(404).json({ message: "Xabar topilmadi!" });
    }
  } catch (error) {
    console.error("Xabar o'chirishda xato:", error.message, error.stack);
    res.status(500).json({ message: "Xabar o'chirishda xato yuz berdi!" });
  }
});

// Xabar ID o'zgartirish
router.put("/:id/change-id", async (req, res) => {
  const { id } = req.params;
  const { newId } = req.body;

  try {
    if (!newId || typeof newId !== "number") {
      return res.status(400).json({ message: "Yangi ID raqam sifatida kiritilishi shart!" });
    }

    const message = await Message.findOne({ id: parseInt(id) });
    if (!message) {
      return res.status(404).json({ message: "Xabar topilmadi!" });
    }

    const existingMessage = await Message.findOne({ id: newId });
    if (existingMessage && existingMessage._id.toString() !== message._id.toString()) {
      return res.status(400).json({ message: "Bu ID allaqachon ishlatilgan!" });
    }

    message.id = newId;
    await message.save();

    const remainingMessages = await Message.find({ id: { $gt: parseInt(id) } }).sort({ id: 1 });
    for (let i = 0; i < remainingMessages.length; i++) {
      remainingMessages[i].id = parseInt(id) + i + 1;
      await remainingMessages[i].save();
    }

    res.status(200).json(message);
    console.log("ID o'zgartirildi:", { oldId: id, newId });
  } catch (error) {
    console.error("ID o'zgartirishda xato:", error.message, error.stack);
    res.status(500).json({ message: "ID o'zgartirishda xato yuz berdi!" });
  }
});

module.exports = router;