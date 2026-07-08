const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers, network, artifacts } = hre;

async function main() {
  console.log("Deploying ke network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // 1) Deploy MockZKPVerifier dulu (PENGGANTI SEMENTARA verifier ZKP asli)
  //    PENTING: sebelum submit final, ganti ini dengan verifier.sol hasil compile snarkjs
  const MockVerifier = await ethers.getContractFactory("MockZKPVerifier");
  const mockVerifier = await MockVerifier.deploy();
  await mockVerifier.waitForDeployment();
  const verifierAddress = await mockVerifier.getAddress();
  console.log("MockZKPVerifier deployed di:", verifierAddress);

  // 2) Deploy ZFreelance, sambil kasih tahu alamat verifier di atas
  const ZFreelance = await ethers.getContractFactory("ZFreelance");
  const zfreelance = await ZFreelance.deploy(verifierAddress);
  await zfreelance.waitForDeployment();
  const contractAddress = await zfreelance.getAddress();
  console.log("ZFreelance deployed di:", contractAddress);

  // 3) Ambil ABI hasil compile, lalu tulis ke /shared/abi/ZFreelance.json
  //    supaya Backend & Frontend pakai ABI + address yang sama persis (Bagian A Kontrak Integrasi)
  const artifact = await artifacts.readArtifact("ZFreelance");

  const outputData = {
    network: network.name,
    contractAddress: contractAddress,
    verifierAddress: verifierAddress,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  const outputDir = path.join(__dirname, "..", "..", "shared", "abi");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, "ZFreelance.json");
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  console.log("\n✅ ABI + address berhasil ditulis ke:", outputPath);
  console.log("   Bagikan file ini ke Backend & Frontend Engineer, atau commit ke repo.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});