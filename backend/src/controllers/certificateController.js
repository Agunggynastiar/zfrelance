const prisma = require("../config/prisma");

const createCertificate = async (req, res) => {
  try {
    const { institutionName, certificateCode } = req.body;

    if (!institutionName || !certificateCode) {
      return res.status(400).json({ error: "institutionName dan certificateCode wajib diisi" });
    }

    const certificate = await prisma.rawCertificate.create({
      data: {
        userId: req.user.id,
        institutionName,
        certificateCode,
      },
    });

    res.status(201).json({ message: "Certificate berhasil dibuat", certificate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getCertificates = async (req, res) => {
  try {
    const certificates = await prisma.rawCertificate.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json(certificates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createCertificate,
  getCertificates,
};
