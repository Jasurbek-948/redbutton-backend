const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://localhost:27017/redbutton", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const messageSchema = new mongoose.Schema({
  id: Number,
  text: String,
  maxPressCount: Number,
  specialTexts: [
    {
      id: Number,
      text: String,
      startCount: Number,
      endCount: Number,
    },
  ],
});

const Message = mongoose.model("Message", messageSchema);

// GET so'rovi orqali barcha xabarlarni olish
app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find();
    res.status(200).send(messages);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch messages" });
  }
});

// POST so'rovi orqali yangi matn qo'shish
app.post("/messages", async (req, res) => {
  const { text } = req.body;
  try {
    if (!text) {
      return res.status(400).send({ message: "Text is required" });
    }
    const messagesCount = await Message.countDocuments();
    const newMessage = new Message({
      id: messagesCount + 1,
      text,
      maxPressCount: 0,
      specialTexts: [],
    });
    await newMessage.save();
    res.status(201).send(newMessage);
  } catch (error) {
    res.status(500).send({ message: "Failed to add new message" });
  }
});

// GET so'rovi orqali bitta xabarni olish
app.get("/messages/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const message = await Message.findOne({ id: parseInt(id) });
    if (message) {
      res.status(200).send(message);
    } else {
      res.status(404).send({ message: "Message not found" });
    }
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch message" });
  }
});

// POST so'rovi orqali mavjud xabarga special text qo'shish
app.post("/messages/:id/specialText", async (req, res) => {
  const { id } = req.params;
  const { specialText, startCount, endCount } = req.body;

  try {
    const message = await Message.findOne({ id: parseInt(id) });

    if (message) {
      if (!specialText || startCount === undefined || endCount === undefined) {
        return res.status(400).send({ message: "Missing required fields" });
      }

      const specialTextId = message.specialTexts.length + 1;

      message.specialTexts.push({
        id: specialTextId,
        text: specialText,
        startCount: parseInt(startCount) || 0,
        endCount: parseInt(endCount) || 0,
      });

      await message.save();
      res.status(200).send(message);
    } else {
      res.status(404).send({ message: "Message not found" });
    }
  } catch (error) {
    res.status(500).send({ message: "Failed to add special text" });
  }
});

// PUT so'rovi orqali special text-ni yangilash
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
        res.status(200).send(message);
      } else {
        res.status(404).send({ message: "Special text not found" });
      }
    } else {
      res.status(404).send({ message: "Message not found" });
    }
  } catch (error) {
    res.status(500).send({ message: "Failed to update special text" });
  }
});

// PUT so'rovi orqali xabarni yangilash
app.put("/messages/:id", async (req, res) => {
  const { id } = req.params;
  const { maxPressCount } = req.body;

  try {
    const message = await Message.findOne({ id: parseInt(id) });

    if (message) {
      message.maxPressCount = parseInt(maxPressCount) || message.maxPressCount;
      await message.save();
      res.status(200).send(message);
    } else {
      res.status(404).send({ message: "Message not found" });
    }
  } catch (error) {
    res.status(500).send({ message: "Failed to update message" });
  }
});

// DELETE so'rovi orqali xabarni o'chirish
app.delete("/messages/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const message = await Message.findOneAndDelete({ id: parseInt(id) });
    if (message) {
      // After deletion, update IDs of remaining messages to maintain sequential order
      const remainingMessages = await Message.find({ id: { $gt: parseInt(id) } }).sort({ id: 1 });
      for (let i = 0; i < remainingMessages.length; i++) {
        remainingMessages[i].id = parseInt(id) + i + 1;
        await remainingMessages[i].save();
      }
      res.status(200).send({ message: "Message deleted successfully" });
    } else {
      res.status(404).send({ message: "Message not found" });
    }
  } catch (error) {
    res.status(500).send({ message: "Failed to delete message" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});