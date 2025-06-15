const jwt = require("jsonwebtoken");
require("dotenv").config();

const adminAuth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "Autentifikatsiya talab qilinadi!" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    console.error("JWT xatosi:", error.message, error.stack);
    res.status(401).json({ message: "Noto'g'ri yoki eskirgan token!" });
  }
};

module.exports = adminAuth;