const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  createGig,
  getGigs,
  getGigById,
  updateGig,
  takeGig,
} = require("../controllers/gigController");

router.get("/", authMiddleware, getGigs);
router.post("/", authMiddleware, createGig);
router.get("/:id", authMiddleware, getGigById);
router.put("/:id", authMiddleware, updateGig);
router.post("/:id/take", authMiddleware, takeGig);

module.exports = router;
