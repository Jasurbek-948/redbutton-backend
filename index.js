const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect("mongodb+srv://uzwebcoder:40g948sa@cluster0.f4o0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB ulandi!"))
  .catch((e) => console.error("MongoDB ulanishda xato:", e.message));

// Message Schema
const messageSchema = new mongoose.Schema({
  id: Number,
  text: String,
  maxPressCount: Number,
  specialText: [
    {
      id: Number,
      text: String,
      startCount: Number,
      endCount: Number,
    },
  ],
});

// User Schema for tracking user state
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  currentIndex: { type: Number, default: 0 },
  pressCount: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);
const User = mongoose.model("UserState", userSchema);

// GET all messages
app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find();
    res.status(200).json(messages);
  } catch (error) {
    console.error("Xabarlarni olishda xato:", error.message);
    res.status(500).json({ message: "Xabarlarni olishda xato yuz berdi!" });
  }
});

// POST new message
app.post("/messages", async (req, res) => {
  const { text } = req.body;
  try {
    if (!text) {
      return res.status(400).json({ message: "Matn kiritish shart!" });
    }
    const messagesCount = await Message.countDocuments();
    const newMessage = new Message({
      id: messagesCount + 1,
      text,
      maxPressCount: 0,
      specialText: [],
    });
    await newMessage.save();
    res.status(201).json(newMessage);
    console.log("Yangi xabar qo‘shildi:", newMessage);
  } catch (error) {
    console.error("Xabar qo‘shishda xato:", error.message);
    res.status(500).json({ message: "Xabar qo‘shishda xato yuz berdi!" });
  }
});

// GET single message by ID
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
    console.error("Xabar olishda xato:", error.message);
    res.status(500).json({ message: "Xabar olishda xato yuz berdi!" });
  }
});

// POST special text to a message
app.post("/messages/:id/specialText", async (req, res) => {
  const { id } = req.params;
  const { specialText, startCount, endCount } = req.body;

  try {
    const message = await Message.findOne({ id: parseInt(id) });

    if (message) {
      if (!specialText || startCount === undefined || endCount === undefined) {
        return res.status(400).json({ message: "Barcha maydonlarni to‘ldiring!" });
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
      console.log("Maxsus matn qo‘shildi:", { id, specialText });
    } else {
      res.status(404).json({ message: "Xabar topilmadi!" });
    }
  } catch (error) {
    console.error("Maxsus matn qo‘shishda xato:", error.message);
    res.status(500).json({ message: "Maxsus matn qo‘shishda xato yuz berdi!" });
  }
});

// PUT update special text
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
    console.error("Maxsus matn yangilashda xato:", error.message);
    res.status(500).json({ message: "Maxsus matn yangilashda xato yuz berdi!" });
  }
});

// PUT update message
app.put("/messages/:id", async (req, res) => {
  const { id } = req.params;
  const { maxPressCount } = req.body;

  try {
    const message = await Message.findOne({ id: parseInt(id) });

    if (message) {
      message.maxPressCount = parseInt(maxPressCount) || message.maxPressCount;
      await message.save();
      res.status(200).json(message);
      console.log("Xabar yangilandi:", { id, maxPressCount });
    } else {
      res.status(404).json({ message: "Xabar topilmadi!" });
    }
  } catch (error) {
    console.error("Xabar yangilashda xato:", error.message);
    res.status(500).json({ message: "Xabar yangilashda xato yuz berdi!" });
  }
});

// DELETE message
app.delete("/messages/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const message = await Message.findOneAndDelete({ id: parseInt(id) });
    if (message) {
      // Update IDs of remaining messages
      const remainingMessages = await Message.find({ id: { $gt: parseInt(id) } }).sort({ id: 1 });
      for (let i = 0; i < remainingMessages.length; i++) {
        remainingMessages[i].id = parseInt(id) + i + 1;
        await remainingMessages[i].save();
      }
      res.status(200).json({ message: "Xabar muvaffaqiyatli o‘chirildi!" });
      console.log("Xabar o‘chirildi:", { id });
    } else {
      res.status(404).json({ message: "Xabar topilmadi!" });
    }
  } catch (error) {
    console.error("Xabar o‘chirishda xato:", error.message);
    res.status(500).json({ message: "Xabar o‘chirishda xato yuz berdi!" });
  }
});

// POST save user ID when entering the game
app.post("/userId", async (req, res) => {
  const { userId } = req.body;
  try {
    if (!userId) {
      return res.status(400).json({ message: "userId kiritish shart!" });
    }
    const existingUser = await User.findOne({ userId });
    if (!existingUser) {
      const newUser = new User({
        userId,
        currentIndex: 0,
        pressCount: 0,
        lastActive: new Date(),
      });
      await newUser.save();
      console.log("Yangi foydalanuvchi qo‘shildi:", { userId });
    }
    res.status(200).json({ message: "Foydalanuvchi saqlandi!" });
  } catch (error) {
    console.error("Foydalanuvchi qo‘shishda xato:", error.message);
    res.status(500).json({ message: "Foydalanuvchi qo‘shishda xato yuz berdi!" });
  }
});

// POST save user state
app.post("/user-state", async (req, res) => {
  const { userId, currentIndex, pressCount } = req.body;
  try {
    if (!userId || currentIndex === undefined || pressCount === undefined) {
      return res.status(400).json({ message: "Barcha maydonlarni to‘ldiring!" });
    }
    await User.findOneAndUpdate(
      { userId },
      { currentIndex, pressCount, lastActive: new Date() },
      { upsert: true }
    );
    console.log("Foydalanuvchi holati saqlandi:", { userId, currentIndex, pressCount });
    res.status(200).json({ message: "Foydalanuvchi holati saqlandi!" });
  } catch (error) {
    console.error("Foydalanuvchi holati saqlashda xato:", error.message);
    res.status(500).json({ message: "Foydalanuvchi holati saqlashda xato yuz berdi!" });
  }
});

// GET user state by userId
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
    console.error("Foydalanuvchi holati olishda xato:", error.message);
    res.status(500).json({ message: "Foydalanuvchi holati olishda xato yuz berdi!" });
  }
});

// GET statistics for dashboard
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
    console.error("Statistika olishda xato:", error.message);
    res.status(500).json({ message: "Statistika olishda xato yuz berdi!" });
  }
});

app.listen(3000, () => {
  console.log("Server 3000-portda ishlamoqda!");
});