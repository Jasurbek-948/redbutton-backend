const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const messageRoutes = require("./routes/messages");
const userRoutes = require("./routes/users");
const statsRoutes = require("./routes/stats");
const adminRoutes = require("./routes/admin");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/messages", messageRoutes);
app.use("/", userRoutes);
app.use("/stats", statsRoutes);
app.use("/admin", adminRoutes);

// Database connection and server start
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda ishlamoqda!`);
  });
});

module.exports = app;