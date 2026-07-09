const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

router.post("/verify-trigger", authMiddleware, async (req, res) => {
  try {
    res.json({ status: "triggered" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
