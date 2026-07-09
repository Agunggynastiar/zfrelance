const { ethers } = require("ethers");
const prisma = require("../config/prisma");
const contractArtifact = require("../../../shared/abi/ZFreelance.json");

const getContract = () => {
  const rpcUrl = process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Contract(contractArtifact.contractAddress, contractArtifact.abi, provider);
};

const getGigOnChain = async (gigId) => {
  const contract = getContract();
  const onChainGig = await contract.getGig(gigId);

  const statusMap = {
    0: "Open",
    1: "InProgress",
    2: "Submitted",
    3: "Verified",
    4: "Paid",
    5: "Disputed",
  };

  return {
    employer: onChainGig.employer,
    freelancer: onChainGig.freelancer,
    amount: Number(onChainGig.amount),
    credentialHash: onChainGig.credentialHash,
    status: statusMap[Number(onChainGig.status)] || "Unknown",
  };
};

const syncGigIndexFromChain = async () => {
  try {
    const contract = getContract();
    const latestBlock = await contract.runner.provider.getBlockNumber();
    const allGigIndexes = await prisma.gigIndex.findMany({
      select: { lastSyncedBlock: true },
    });

    const lastSyncedBlock = allGigIndexes.reduce(
      (max, item) => Math.max(max, item.lastSyncedBlock || 0),
      0
    );

    const fromBlock = lastSyncedBlock + 1;
    const events = await contract.queryFilter(contract.filters.GigPosted(), fromBlock, latestBlock);

    await Promise.all(
      events.map(async (event) => {
        const gigId = Number(event.args.gigId);
        const amount = Number(event.args.amount);

        await prisma.gigIndex.upsert({
          where: { gigId },
          update: {
            employerWallet: event.args.employer,
            amount: amount.toString(),
            status: "Open",
            lastSyncedBlock: latestBlock,
          },
          create: {
            gigId,
            employerWallet: event.args.employer,
            amount: amount.toString(),
            status: "Open",
            lastSyncedBlock: latestBlock,
          },
        });
      })
    );

    return {
      lastSyncedBlock: latestBlock,
      isSyncing: false,
      syncedCount: events.length,
    };
  } catch (error) {
    console.error(error);
    return {
      lastSyncedBlock: 0,
      isSyncing: false,
    };
  }
};

module.exports = {
  getContract,
  getGigOnChain,
  syncGigIndexFromChain,
};
