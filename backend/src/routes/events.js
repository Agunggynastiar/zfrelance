const express = require("express");
const router = express.Router();
const { syncGigIndexFromChain } = require("../services/contractService");

router.get("/sync-status", async (req, res) => {
  try {
    const syncStatus = await syncGigIndexFromChain();

    res.json(syncStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
