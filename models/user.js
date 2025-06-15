const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  currentIndex: { type: Number, default: 0 },
  pressCount: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  pushToken: { type: String },
  yellowTextIndex: { type: Number, default: 0 },
  greenTextIndex: { type: Number, default: 0 },
});

module.exports = mongoose.model("UserState", userSchema);