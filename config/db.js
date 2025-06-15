const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://uzwebcoder:40g948_SA@cluster0.f4o0m.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("MongoDB ulandi!");
  } catch (error) {
    console.error("MongoDB ulanishda xato:", error.message, error.stack);
    process.exit(1);
  }
};

module.exports = connectDB;