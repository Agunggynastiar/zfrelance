const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { createCertificate, getCertificates } = require("../controllers/certificateController");

router.get("/", authMiddleware, getCertificates);
router.post("/", authMiddleware, createCertificate);

module.exports = router;
