const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("./models/admin");
const connectDB = require("./config/db");

async function createAdmin() {
  await connectDB();
  const username = "uzwebcoder";
  const password = "40g948_SAA"; // Replace with a strong password
  try {
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      console.log("Admin allaqachon mavjud!");
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({ username, password: hashedPassword });
    await admin.save();
    console.log("Admin muvaffaqiyatli yaratildi!");
  } catch (error) {
    console.error("Admin yaratishda xato:", error.message, error.stack);
  } finally { 
    mongoose.connection.close();
  } 
}

createAdmin();