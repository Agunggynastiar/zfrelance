const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const gigRoutes = require("./routes/gigs");
const workRoutes = require("./routes/work");
const oracleRoutes = require("./routes/oracle");
const eventRoutes = require("./routes/events");
const certificateRoutes = require("./routes/certificates");

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/gigs", gigRoutes);
app.use("/api/work", workRoutes);
app.use("/api/oracle", oracleRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/certificates", certificateRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "ZFreelance Backend Running"
  });
});

module.exports = app;