const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const uploadProfilePhoto = require("../middleware/uploadMiddleware");
const {
  getProfile,
  getProfileByWalletAddress,
  updateProfile,
  uploadProfilePhoto: uploadProfilePhotoController,
} = require("../controllers/profileController");

router.get("/", authMiddleware, getProfile);
router.post("/photo", authMiddleware, uploadProfilePhoto, uploadProfilePhotoController);
router.put("/", authMiddleware, updateProfile);
router.get("/:walletAddress", getProfileByWalletAddress);

module.exports = router;