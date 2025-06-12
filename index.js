const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const app = express();

app.use(express.json());
app.use(cors());

// MongoDB ulanishi
mongoose.connect("mongodb+srv://uzwebcoder:40g948sa@cluster0.f4o0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB ulandi!"))
  .catch((e) => console.error("MongoDB ulanishda xato:", e.message, e.stack));

// Message sxemasi
const messageSchema = new mongoose.Schema({
  id: Number,
  text: String,
  maxPressCount: Number,
  buttonSize: { type: Number, default: 130 }, // Yangi maydon: button razmeri
  showYellowButton: { type: Boolean, default: false }, // Yangi maydon: sariq tugma ko'rsatiladimi
  specialTexts: [
    {
      id: Number,
      text: String,
      startCount: Number,
      endCount: Number,
    },
  ],
});

// User sxemasi
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  currentIndex: { type: Number, default: 0 },
  pressCount: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  pushToken: { type: String },
});

const Message = mongoose.model("Message", messageSchema);
const User = mongoose.model("UserState", userSchema);

// Barcha xabarlarni olish
app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find();
    res.status(200).json(messages);
  } catch (error) {
    console.error("Xabarlarni olishda xato:", error.message, error.stack);
    res.status(500).json({ message: "Xabarlarni olishda xato yuz berdi!" });
  }
});

// Yangi xabar qo'shish va push xabarnoma yuborish
app.post("/messages", async (req, res) => {
  const { text, buttonSize, showYellowButton } = req.body;
  try {
    if (!text) {
      return res.status(400).json({ message: "Matn kiritish shart!" });
    }
    const messagesCount = await Message.countDocuments();
    const newMessage = new Message({
      id: messagesCount + 1,
      text,
      maxPressCount: 0,
      buttonSize: buttonSize || 130, // Default razmer
      showYellowButton: showYellowButton || false, // Default false
      specialTexts: [],
    });
    await newMessage.save();
    console.log("Yangi xabar qo'shildi:", newMessage);

    // Faqat 30 soniyadan ko'proq faol bo'lmagan foydalanuvchilarga push xabarnoma
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
app.get("/messages/:id", async (req, res) => {
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
app.post("/messages/:id/specialText", async (req, res) => {
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
app.put("/messages/:id/specialText/:specialTextId", async (req, res) => {
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

// Xabarni yangilash
app.put("/messages/:id", async (req, res) => {
  const { id } = req.params;
  const { maxPressCount, buttonSize, showYellowButton } = req.body;

  try {
    const message = await Message.findOne({ id: parseInt(id) });

    if (message) {
      message.maxPressCount = parseInt(maxPressCount) || message.maxPressCount;
      message.buttonSize = parseInt(buttonSize) || message.buttonSize;
      message.showYellowButton = showYellowButton !== undefined ? showYellowButton : message.showYellowButton;
      await message.save();
      res.status(200).json(message);
      console.log("Xabar yangilandi:", { id, maxPressCount, buttonSize, showYellowButton });
    } else {
      res.status(404).json({ message: "Xabar topilmadi!" });
    }
  } catch (error) {
    console.error("Xabar yangilashda xato:", error.message, error.stack);
    res.status(500).json({ message: "Xabar yangilashda xato yuz berdi!" });
  }
});

// Xabarni o'chirish
app.delete("/messages/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const message = await Message.findOneAndDelete({ id: parseInt(id) });
    if (message) {
      const remainingMessages = await Message.find({ id: {
        $gt: parseInt(id) } }).sort({ id: 1 });
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

// Foydalanuvchi ID va push tokenini saqlash
app.post("/userId", async (req, res) => {
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
app.post("/user-activity", async (req, res) => {
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
app.post("/user-state", async (req, res) => {
  const { userId, currentIndex, pressCount } = req.body;
  try {
    console.log("POST /user-state:", { userId, currentIndex, pressCount });
    if (!userId || currentIndex === undefined || pressCount === undefined) {
      console.warn("Invalid user-state data:", req.body);
      return res.status(400).json({ message: "Barcha maydonlarni to'ldiring!" });
    }
    await User.findOneAndUpdate(
      { userId },
      { currentIndex, pressCount, lastActive: new Date() },
      { upsert: true }
    );
    console.log("Foydalanuvchi holati saqlandi:", { userId, currentIndex, pressCount });
    res.status(200).json({ message: "Foydalanuvchi holati saqlandi!" });
  } catch (error) {
    console.error("Foydalanuvchi holati saqlashda xato:", error.message, error.stack);
    res.status(500).json({ message: "Foydalanuvchi holati saqlashda xato yuz berdi!" });
  }
});

// Foydalanuvchi holatini olish
app.get("/user-state/:userId", async (req, res) => {
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

// Statistika olish
app.get("/stats", async (req, res) => {
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

// Maxsus push xabarnoma yuborish
app.post("/send-push", async (req, res) => {
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

app.listen(3000, () => {
  console.log("Server 3000-portda ishlamoqda!");
});

module.exports = app;