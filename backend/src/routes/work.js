const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const uploadWorkFile = require("../middleware/workUploadMiddleware");
const { uploadWork } = require("../controllers/workController");

router.post("/upload", authMiddleware, uploadWorkFile, uploadWork);

module.exports = router;
