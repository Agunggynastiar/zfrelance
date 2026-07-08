const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers, network, artifacts } = hre;

async function main() {
  console.log("Deploying ke network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // 1) Deploy Groth16Verifier (mesin kriptografi hasil generate snarkjs)
  const Groth16Verifier = await ethers.getContractFactory("Groth16Verifier");
  const groth16Verifier = await Groth16Verifier.deploy();
  await groth16Verifier.waitForDeployment();
  const groth16Address = await groth16Verifier.getAddress();
  console.log("Groth16Verifier deployed di:", groth16Address);

  // 2) Deploy ZKPVerifierAdapter (penerjemah ke interface IZKPVerifier)
  const Adapter = await ethers.getContractFactory("ZKPVerifierAdapter");
  const adapter = await Adapter.deploy(groth16Address);
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log("ZKPVerifierAdapter deployed di:", adapterAddress);

  // 3) Deploy ZFreelance, pakai adapter (BUKAN MockZKPVerifier lagi)
  const ZFreelance = await ethers.getContractFactory("ZFreelance");
  const zfreelance = await ZFreelance.deploy(adapterAddress);
  await zfreelance.waitForDeployment();
  const contractAddress = await zfreelance.getAddress();
  console.log("ZFreelance deployed di:", contractAddress);

  // 4) Tulis ABI + semua address ke /shared/abi/ZFreelance.json
  const artifact = await artifacts.readArtifact("ZFreelance");

  const outputData = {
    network: network.name,
    contractAddress: contractAddress,
    verifierAddress: adapterAddress,
    groth16VerifierAddress: groth16Address,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  const outputDir = path.join(__dirname, "..", "..", "shared", "abi");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, "ZFreelance.json");
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  console.log("\n✅ ABI + address (verifier ASLI) berhasil ditulis ke:", outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});