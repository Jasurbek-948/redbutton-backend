const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const app = express();

// Middleware
app.use(cors()); // Enable CORS for React Native and web app
app.use(express.json()); // Parse JSON request bodies

// MongoDB connection
mongoose
  .connect("mongodb+srv://uzwebcoder:40g948sa@cluster0.f4o0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));
 
// Mongoose Schema for Message
const messageSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  text: { type: String, required: true },
  maxPressCount: { type: Number, default: 0 },
  specialTexts: [
    {
      id: { type: Number, required: true },
      text: { type: String, required: true },
      startCount: { type: Number, required: true },
      endCount: { type: Number, required: true },
    },
  ],
});

// Mongoose Schema for User Progress
const userProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  level: { type: Number, default: 1 },
  pressCount: { type: Number, default: 0 },
  ipAddress: { type: String, required: true },
  deviceName: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now },
});

// Mongoose Models
const Message = mongoose.model("Message", messageSchema);
const UserProgress = mongoose.model("UserProgress", userProgressSchema);

// Serve static images from the 'images' directory
app.use("/images", express.static(path.join(__dirname, "images")));

// GET /messages - Fetch all messages
app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find();
    res.status(200).send(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).send({ message: "Failed to fetch messages" });
  }
});

// GET /messages/:id - Fetch a specific message by ID
app.get("/messages/:id", async (req, res) => {
  try {
    const message = await Message.findOne({ id: parseInt(req.params.id) });
    if (!message) {
      return res.status(404).send({ message: "Message not found" });
    }
    res.status(200).send(message);
  } catch (error) {
    console.error("Error fetching message:", error);
    res.status(500).send({ message: "Failed to fetch message" });
  }
});

// POST /messages - Add a new message
app.post("/messages", async (req, res) => {
  try {
    const { text } = req.body;
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
    console.error("Error adding new message:", error);
    res.status(500).send({ message: "Failed to add new message" });
  }
});

// POST /messages/:id/specialText - Add special text to a message
app.post("/messages/:id/specialText", async (req, res) => {
  try {
    const { specialText, startCount, endCount } = req.body;
    const message = await Message.findOne({ id: parseInt(req.params.id) });
    if (!message) {
      return res.status(404).send({ message: "Message not found" });
    }

    if (!specialText || startCount === undefined || endCount === undefined) {
      return res.status(400).send({ message: "Missing required fields" });
    }

    const specialTextId = message.specialTexts.length + 1;
    message.specialTexts.push({
      id: specialTextId,
      text: specialText,
      startCount: parseInt(startCount),
      endCount: parseInt(endCount),
    });
    await message.save();
    res.status(200).send(message);
  } catch (error) {
    console.error("Error adding special text:", error);
    res.status(500).send({ message: "Failed to add special text" });
  }
});

// PUT /messages/:id/specialText/:specialTextId - Update special text
app.put("/messages/:id/specialText/:specialTextId", async (req, res) => {
  try {
    const { specialText, startCount, endCount } = req.body;
    const message = await Message.findOne({ id: parseInt(req.params.id) });
    if (!message) {
      return res.status(404).send({ message: "Message not found" });
    }

    const specialTextObj = message.specialTexts.find(
      (text) => text.id === parseInt(req.params.specialTextId)
    );
    if (!specialTextObj) {
      return res.status(404).send({ message: "Special text not found" });
    }

    if (specialText) specialTextObj.text = specialText;
    if (startCount !== undefined)
      specialTextObj.startCount = parseInt(startCount);
    if (endCount !== undefined) specialTextObj.endCount = parseInt(endCount);
    await message.save();
    res.status(200).send(message);
  } catch (error) {
    console.error("Error updating special text:", error);
    res.status(500).send({ message: "Failed to update special text" });
  }
});

// PUT /messages/:id - Update maxPressCount of a message
app.put("/messages/:id", async (req, res) => {
  try {
    const { maxPressCount } = req.body;
    const message = await Message.findOne({ id: parseInt(req.params.id) });
    if (!message) {
      return res.status(404).send({ message: "Message not found" });
    }

    message.maxPressCount = parseInt(maxPressCount) || message.maxPressCount;
    await message.save();
    res.status(200).send(message);
  } catch (error) {
    console.error("Error updating message:", error);
    res.status(500).send({ message: "Failed to update message" });
  }
});

// POST /press - Handle button press and update user progress
app.post("/press", async (req, res) => {
  try {
    const { userId, messageId, deviceName } = req.body;
    const ipAddress = req.ip; // Get IP address from request

    if (!userId || !messageId) {
      return res.status(400).send({ message: "userId and messageId are required" });
    }

    const message = await Message.findOne({ id: parseInt(messageId) });
    if (!message) {
      return res.status(404).send({ message: "Message not found" });
    }

    // Calculate level based on number of words in message text
    const wordCount = message.text.trim().split(/\s+/).length;

    // Update or create user progress
    const userProgress = await UserProgress.findOneAndUpdate(
      { userId },
      {
        level: wordCount,
        $inc: { pressCount: 1 },
        ipAddress,
        deviceName,
        lastUpdated: Date.now(),
      },
      { upsert: true, new: true }
    );

    res.status(200).send({ message: "Press recorded" });
  } catch (error) {
    console.error("Error processing press:", error);
    res.status(500).send({ message: "Failed to process press" });
  }
});

// GET /admin/users - Admin endpoint to view all user progress
app.get("/admin/users", async (req, res) => {
  try {
    // Add authentication for admin access (e.g., token-based) in production
    const users = await UserProgress.find();
    res.status(200).send(users);
  } catch (error) {
    console.error("Error fetching user progress:", error);
    res.status(500).send({ message: "Failed to fetch user progress" });
  }
});

// GET /banners - Serve banner image URLs
app.get("/banners", (req, res) => {
  res.json({
    topBanner: "http://10.0.2.2:3000/images/top_banner.png",
    bottomBanner: "http://10.0.2.2:3000/images/bottom_banner.png",
  });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});