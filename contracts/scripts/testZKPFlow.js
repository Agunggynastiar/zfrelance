const hre = require("hardhat");
const { ethers } = hre;
const snarkjs = require("snarkjs");
const circomlibjs = require("circomlibjs");
const path = require("path");

async function main() {
  // ============ 1) Freelancer punya "kode rahasia sertifikat" ============
  // Di aplikasi nyata, ini diinput freelancer di form register (angka apa saja, unik per orang)
  const certificateSecret = 123456789n;

  // ============ 2) Hitung Poseidon hash dari secret ============
  // WAJIB pakai circomlibjs (bukan hash biasa) supaya hasilnya identik dengan yang dihitung circuit
  console.log("Menghitung Poseidon hash dari secret...");
  const poseidon = await circomlibjs.buildPoseidon();
  const hashRaw = poseidon([certificateSecret]);
  const credentialHashBigInt = poseidon.F.toObject(hashRaw);
  console.log("credentialHash (public):", credentialHashBigInt.toString());

  // ============ 3) Generate proof ZKP pakai snarkjs ============
  console.log("\nGenerating proof ZKP (mungkin butuh beberapa detik)...");
  const wasmPath = path.join(__dirname, "..", "..", "circuits", "build", "certificateProof_js", "certificateProof.wasm");
  const zkeyPath = path.join(__dirname, "..", "..", "circuits", "build", "certificateProof_final.zkey");

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
      certificateSecret: certificateSecret.toString(),
      credentialHash: credentialHashBigInt.toString(),
    },
    wasmPath,
    zkeyPath
  );
  console.log("Proof berhasil dibuat. Public signals:", publicSignals);

  // ============ 4) Format proof jadi calldata Solidity (urutan G2 point diurus snarkjs) ============
  const callDataStr = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  const [a, b, c, pubSignalsArr] = JSON.parse("[" + callDataStr + "]");

  // ============ 5) Encode proof jadi bytes sesuai format ZKPVerifierAdapter ============
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedProof = abiCoder.encode(
    ["uint256[2]", "uint256[2][2]", "uint256[2]"],
    [a, b, c]
  );
  const credentialHashBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(pubSignalsArr[0])), 32);

  // ============ 6) Deploy rantai contract segar untuk testing ============
  console.log("\nDeploy Groth16Verifier -> ZKPVerifierAdapter -> ZFreelance...");
  const [deployer, freelancer] = await ethers.getSigners();

  const Groth16Verifier = await ethers.getContractFactory("Groth16Verifier");
  const groth16Verifier = await Groth16Verifier.deploy();
  await groth16Verifier.waitForDeployment();

  const Adapter = await ethers.getContractFactory("ZKPVerifierAdapter");
  const adapter = await Adapter.deploy(await groth16Verifier.getAddress());
  await adapter.waitForDeployment();

  const ZFreelance = await ethers.getContractFactory("ZFreelance");
  const zfreelance = await ZFreelance.deploy(await adapter.getAddress());
  await zfreelance.waitForDeployment();

  // ============ 7) TES: registerFreelancer dengan proof ASLI ============
  console.log("\nMemanggil registerFreelancer() dengan proof ZKP asli...");
  const tx = await zfreelance.connect(freelancer).registerFreelancer(encodedProof, credentialHashBytes32);
  await tx.wait();

  const stored = await zfreelance.getVerifiedCredential(freelancer.address);
  console.log("✅ BERHASIL! credentialHash tersimpan on-chain:", stored);
  console.log("   (cocok dengan yang dihitung tadi:", credentialHashBytes32, ")");

  // ============ 8) TES NEGATIF: proof dengan secret yang SALAH harus DITOLAK ============
  console.log("\nMenguji proof dengan secret SALAH (harus gagal/ditolak)...");
  try {
    const wrongSecret = 999999999n;
    const { proof: wrongProof, publicSignals: wrongPublic } = await snarkjs.groth16.fullProve(
      {
        certificateSecret: wrongSecret.toString(),
        credentialHash: credentialHashBigInt.toString(), // sengaja pakai hash yang BEDA dari secretnya
      },
      wasmPath,
      zkeyPath
    );
    console.log("⚠️  Seharusnya proof generation gagal di sini karena constraint tidak terpenuhi");
  } catch (err) {
    console.log("✅ Sesuai harapan: proof generation GAGAL karena secret tidak cocok dengan credentialHash");
    console.log("   (constraint circuit menolak input yang tidak valid)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });