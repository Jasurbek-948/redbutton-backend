const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  id: Number,
  text: String,
  maxPressCount: Number,
  buttonSize: { type: Number, default: 130 },
  showYellowButton: { type: Boolean, default: false },
  showRedButton: { type: Boolean, default: true },
  showGreenButton: { type: Boolean, default: false },
  buttonCount: { type: Number, default: 1 },
  yellowButtonText: { type: String, default: "Sariq Personaj!" },
  yellowButtonTexts: [{ type: String }],
  greenButtonTexts: [{ type: String }],
  specialTexts: [
    {
      id: Number,
      text: String,
      startCount: Number,
      endCount: Number,
    },
  ],
});

module.exports = mongoose.model("Message", messageSchema);