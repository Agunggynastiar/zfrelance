const prisma = require("../config/prisma");

const getProfileByWalletAddress = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        walletAddress: req.params.walletAddress,
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    res.json({
      name: user.name,
      photoUrl: user.profile?.photoUrl ?? null,
      portfolio: user.profile?.portfolio ?? null,
      credentialBadge: user.role === "freelancer" ? "verified" : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    res.json({
      id: user.id,
      walletAddress: user.walletAddress,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      profile: user.profile,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { bio, portfolio } = req.body;

    const existingProfile = await prisma.profile.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    const profile = existingProfile
      ? await prisma.profile.update({
          where: { userId: req.user.id },
          data: {
            bio: bio ?? existingProfile.bio,
            portfolio: portfolio ?? existingProfile.portfolio,
          },
        })
      : await prisma.profile.create({
          data: {
            userId: req.user.id,
            bio: bio ?? null,
            portfolio: portfolio ?? null,
          },
        });

    res.json({
      message: "Profil berhasil diperbarui",
      profile,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({ error: error.message });
  }
};

const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Foto profil wajib diunggah" });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    const existingProfile = await prisma.profile.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    const profile = existingProfile
      ? await prisma.profile.update({
          where: { userId: req.user.id },
          data: { photoUrl },
        })
      : await prisma.profile.create({
          data: {
            userId: req.user.id,
            photoUrl,
          },
        });

    res.json({
      message: "Foto profil berhasil diunggah",
      photoUrl,
      profile,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  getProfileByWalletAddress,
};