const prisma = require("../config/prisma");
const { getGigOnChain } = require("../services/contractService");

const normalizeStatus = (status) => {
  const statusMap = {
    OPEN: "Open",
    IN_PROGRESS: "InProgress",
    SUBMITTED: "Submitted",
    VERIFIED: "Verified",
    PAID: "Paid",
    DISPUTED: "Disputed",
  };

  return statusMap[status?.toUpperCase()] || status || "Open";
};

const createGig = async (req, res) => {
  try {
    if (req.user.role !== "employer") {
      return res.status(403).json({ error: "Hanya employer yang dapat membuat gig" });
    }

    const { title, description, budget, amount } = req.body;
    const finalBudget = amount ?? budget;

    if (!title || !description || !finalBudget) {
      return res.status(400).json({ error: "Title, description, dan amount wajib diisi" });
    }

    const gig = await prisma.gig.create({
      data: {
        title,
        description,
        budget: Number(finalBudget),
        employerId: req.user.id,
      },
    });

    res.status(201).json({ message: "Gig berhasil dibuat", gig });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getGigs = async (req, res) => {
  try {
    const statusQuery = req.query.status;
    const page = Number(req.query.page) || 1;
    const pageSize = 10;
    const normalizedStatus = statusQuery ? statusQuery.toUpperCase() : null;

    const gigs = await prisma.gig.findMany({
      where: normalizedStatus ? { status: normalizedStatus } : undefined,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        employer: true,
        freelancer: true,
      },
    });

    const mappedGigs = await Promise.all(
      gigs.map(async (gig) => {
        const onChainData = await getGigOnChain(gig.id).catch(() => null);

        return {
          gigId: gig.id,
          employer: gig.employer?.walletAddress || null,
          amount: gig.budget,
          status: normalizeStatus(gig.status),
          onChain: onChainData,
        };
      })
    );

    res.json(mappedGigs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const getGigById = async (req, res) => {
  try {
    const gig = await prisma.gig.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        employer: true,
        freelancer: true,
      },
    });

    if (!gig) {
      return res.status(404).json({ error: "Gig tidak ditemukan" });
    }

    res.json(gig);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const updateGig = async (req, res) => {
  try {
    const gigId = Number(req.params.id);
    const { title, description, budget, status } = req.body;

    const existingGig = await prisma.gig.findUnique({ where: { id: gigId } });

    if (!existingGig) {
      return res.status(404).json({ error: "Gig tidak ditemukan" });
    }

    if (req.user.role !== "employer" && req.user.id !== existingGig.employerId) {
      return res.status(403).json({ error: "Anda tidak berhak mengubah gig ini" });
    }

    const updatedGig = await prisma.gig.update({
      where: { id: gigId },
      data: {
        title: title ?? existingGig.title,
        description: description ?? existingGig.description,
        budget: budget ? Number(budget) : existingGig.budget,
        status: status ?? existingGig.status,
      },
    });

    res.json({ message: "Gig berhasil diperbarui", gig: updatedGig });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const takeGig = async (req, res) => {
  try {
    if (req.user.role !== "freelancer") {
      return res.status(403).json({ error: "Hanya freelancer yang dapat mengambil gig" });
    }

    const gigId = Number(req.params.id);
    const gig = await prisma.gig.findUnique({ where: { id: gigId } });

    if (!gig) {
      return res.status(404).json({ error: "Gig tidak ditemukan" });
    }

    if (gig.status !== "OPEN") {
      return res.status(400).json({ error: "Gig tidak tersedia untuk diambil" });
    }

    const updatedGig = await prisma.gig.update({
      where: { id: gigId },
      data: {
        freelancerId: req.user.id,
        status: "IN_PROGRESS",
      },
    });

    res.json({ message: "Gig berhasil diambil", gig: updatedGig });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createGig,
  getGigs,
  getGigById,
  updateGig,
  takeGig,
};
