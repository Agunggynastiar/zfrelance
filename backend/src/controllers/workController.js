const path = require("path");
const fs = require("fs");

const uploadWork = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File hasil kerja wajib diunggah" });
    }

    const ext = path.extname(req.file.originalname);
    const cid = `${req.file.filename}${ext}`;
    const proofOfWorkURI = `ipfs://placeholder/${cid}`;

    res.json({
      cid,
      proofOfWorkURI,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  uploadWork,
};
