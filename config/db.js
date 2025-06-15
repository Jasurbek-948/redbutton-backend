const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB ulandi!");
  } catch (error) {
    console.error("MongoDB ulanishda xato:", error.message, error.stack);
    process.exit(1);
  }
};

module.exports = connectDB;