const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");

const uploadWork = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File hasil kerja wajib diunggah" });
    }

    if (!process.env.PINATA_JWT) {
      return res.status(500).json({ error: "PINATA_JWT belum diset di .env" });
    }

    // Ambil file yang sudah disimpan multer di disk lokal
    const filePath = req.file.path;
    const fileStream = fs.createReadStream(filePath);

    const formData = new FormData();
    formData.append("file", fileStream, req.file.originalname);

    // Upload ke Pinata
    const pinataResponse = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
      }
    );

    const cid = pinataResponse.data.IpfsHash;
    const proofOfWorkURI = `ipfs://${cid}`;

    // Opsional: hapus file lokal setelah berhasil upload ke IPFS
    // biar tidak numpuk duplikat di disk server
    fs.unlink(filePath, (err) => {
      if (err) console.error("Gagal hapus file lokal:", err.message);
    });

    res.json({
      cid,
      proofOfWorkURI,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Upload ke IPFS gagal" });
  }
};

module.exports = {
  uploadWork,
};