const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZFreelance", function () {
  let zfreelance, mockVerifier;
  let employer, freelancer, other;

  beforeEach(async function () {
    [employer, freelancer, other] = await ethers.getSigners();

    const MockVerifier = await ethers.getContractFactory("MockZKPVerifier");
    mockVerifier = await MockVerifier.deploy();

    const ZFreelance = await ethers.getContractFactory("ZFreelance");
    zfreelance = await ZFreelance.deploy(await mockVerifier.getAddress());
  });

  it("employer bisa posting gig dan dana ter-lock di kontrak", async function () {
    const amount = ethers.parseEther("1.0");

    await expect(zfreelance.connect(employer).postGig(amount, { value: amount }))
      .to.emit(zfreelance, "GigPosted")
      .withArgs(0, employer.address, amount);

    const gig = await zfreelance.getGig(0);
    expect(gig.employer).to.equal(employer.address);
    expect(gig.amount).to.equal(amount);
    expect(gig.status).to.equal(0); // Status.Open
  });

  it("gagal posting gig kalau ETH yang dikirim tidak sama dengan amount", async function () {
    const amount = ethers.parseEther("1.0");
    const wrongValue = ethers.parseEther("0.5");

    await expect(
      zfreelance.connect(employer).postGig(amount, { value: wrongValue })
    ).to.be.revertedWith("ETH yang dikirim harus sama dengan amount");
  });

  it("freelancer bisa accept gig yang masih Open", async function () {
    const amount = ethers.parseEther("1.0");
    await zfreelance.connect(employer).postGig(amount, { value: amount });

    await expect(zfreelance.connect(freelancer).acceptGig(0))
      .to.emit(zfreelance, "GigAccepted")
      .withArgs(0, freelancer.address);

    const gig = await zfreelance.getGig(0);
    expect(gig.freelancer).to.equal(freelancer.address);
    expect(gig.status).to.equal(1); // Status.InProgress
  });

  it("employer tidak boleh accept gig-nya sendiri", async function () {
    const amount = ethers.parseEther("1.0");
    await zfreelance.connect(employer).postGig(amount, { value: amount });

    await expect(
      zfreelance.connect(employer).acceptGig(0)
    ).to.be.revertedWith("Employer tidak boleh accept gig sendiri");
  });

  it("alur lengkap: post -> accept -> submit -> verifyAndRelease mengirim ETH ke freelancer", async function () {
    const amount = ethers.parseEther("1.0");
    await zfreelance.connect(employer).postGig(amount, { value: amount });
    await zfreelance.connect(freelancer).acceptGig(0);
    await zfreelance.connect(freelancer).submitWork(0, "ipfs://contoh-cid-hasil-kerja");

    const balanceBefore = await ethers.provider.getBalance(freelancer.address);

    const tx = await zfreelance.connect(employer).verifyAndRelease(0);
    await expect(tx)
      .to.emit(zfreelance, "PaymentReleased")
      .withArgs(0, freelancer.address, amount);

    const balanceAfter = await ethers.provider.getBalance(freelancer.address);
    expect(balanceAfter - balanceBefore).to.equal(amount);

    const gig = await zfreelance.getGig(0);
    expect(gig.status).to.equal(4); // Status.Paid
  });

  it("bukan employer tidak boleh trigger verifyAndRelease", async function () {
    const amount = ethers.parseEther("1.0");
    await zfreelance.connect(employer).postGig(amount, { value: amount });
    await zfreelance.connect(freelancer).acceptGig(0);
    await zfreelance.connect(freelancer).submitWork(0, "ipfs://contoh-cid");

    await expect(
      zfreelance.connect(other).verifyAndRelease(0)
    ).to.be.revertedWith("Hanya employer gig ini yang boleh");
  });

  it("employer atau freelancer bisa raiseDispute saat InProgress", async function () {
    const amount = ethers.parseEther("1.0");
    await zfreelance.connect(employer).postGig(amount, { value: amount });
    await zfreelance.connect(freelancer).acceptGig(0);

    await expect(zfreelance.connect(freelancer).raiseDispute(0))
      .to.emit(zfreelance, "DisputeRaised")
      .withArgs(0, freelancer.address);

    const gig = await zfreelance.getGig(0);
    expect(gig.status).to.equal(5); // Status.Disputed
  });

  it("registerFreelancer berhasil dengan mock verifier yang selalu valid", async function () {
    const dummyProof = "0x1234";
    const dummySignal = ethers.encodeBytes32String("cert-valid");

    await expect(zfreelance.connect(freelancer).registerFreelancer(dummyProof, dummySignal))
      .to.emit(zfreelance, "FreelancerRegistered")
      .withArgs(freelancer.address, dummySignal);

    const stored = await zfreelance.getVerifiedCredential(freelancer.address);
    expect(stored).to.equal(dummySignal);
  });

  it("stake dan unstake mengubah saldo dengan benar", async function () {
    const amount = ethers.parseEther("0.5");

    await zfreelance.connect(other).stake(amount, { value: amount });
    expect(await zfreelance.getStakeBalance(other.address)).to.equal(amount);

    await zfreelance.connect(other).unstake(amount);
    expect(await zfreelance.getStakeBalance(other.address)).to.equal(0);
  });
});