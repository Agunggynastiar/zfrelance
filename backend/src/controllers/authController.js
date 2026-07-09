const prisma = require("../config/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  try {
    const {
      walletAddress,
      name,
      password,
      passwordHash,
      role
    } = req.body;

    if (!walletAddress || !name || (!password && !passwordHash) || !role) {
      return res.status(400).json({
        error: "Semua field wajib diisi."
      });
    }

    // Cek apakah wallet sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: {
        walletAddress
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: "Wallet sudah terdaftar."
      });
    }

    const hashedPassword = passwordHash
      ? passwordHash
      : await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        walletAddress,
        name,
        passwordHash: hashedPassword,
        role
      }
    });

    res.status(201).json({
      userId: user.id,
      walletAddress: user.walletAddress,
      role: user.role
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
};



const login = async (req, res) => {
  try {
    const { walletAddress, password, credentialHash } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        walletAddress,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: "Wallet tidak ditemukan",
      });
    }

    if (!password && !credentialHash) {
      return res.status(400).json({
        error: "Password atau credentialHash wajib diisi",
      });
    }

    const validPassword = password
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!validPassword && !credentialHash) {
      return res.status(401).json({
        error: "Password salah",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      token,
      userId: user.id,
      role: user.role,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
};
module.exports = {
  register,
  login
};