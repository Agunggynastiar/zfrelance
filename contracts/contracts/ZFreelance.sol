// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Interface ke smart contract verifier hasil compile Circom/snarkjs (verifier.sol)
// Alamatnya diisi saat deploy (lihat Bagian A Kontrak Integrasi)
interface IZKPVerifier {
    function verifyProof(bytes calldata proof, bytes32 publicSignals) external view returns (bool);
}

contract ZFreelance {
    // ============ STATE ============

    enum Status { Open, InProgress, Submitted, Verified, Paid, Disputed }

    struct GigContract {
        address employer;
        address freelancer;
        uint256 amount;
        bytes32 credentialHash;
        Status status;
        uint256 createdAt;
    }

    mapping(uint256 => GigContract) public gigs;
    uint256 public nextGigId;

    mapping(address => bytes32) public verifiedCredential;
    mapping(address => uint256) public stakeBalance;

    IZKPVerifier public zkpVerifier;

    bool private locked; // dipakai modifier nonReentrant

    // ============ EVENTS ============

    event FreelancerRegistered(address indexed freelancer, bytes32 credentialHash);
    event GigPosted(uint256 indexed gigId, address indexed employer, uint256 amount);
    event GigAccepted(uint256 indexed gigId, address indexed freelancer);
    event WorkSubmitted(uint256 indexed gigId, string proofOfWorkURI);
    event PaymentReleased(uint256 indexed gigId, address indexed freelancer, uint256 amount);
    event DisputeRaised(uint256 indexed gigId, address indexed by);
    event Staked(address indexed validator, uint256 amount);
    event Unstaked(address indexed validator, uint256 amount);

    // ============ MODIFIERS ============

    modifier nonReentrant() {
        require(!locked, "Reentrant call ditolak");
        locked = true;
        _;
        locked = false;
    }

    modifier onlyEmployer(uint256 gigId) {
        require(gigs[gigId].employer == msg.sender, "Hanya employer gig ini yang boleh");
        _;
    }

    modifier onlyFreelancer(uint256 gigId) {
        require(gigs[gigId].freelancer == msg.sender, "Hanya freelancer gig ini yang boleh");
        _;
    }

    modifier onlyValidStatus(uint256 gigId, Status expected) {
        require(gigs[gigId].status == expected, "Status gig tidak sesuai untuk aksi ini");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(address zkpVerifierAddress) {
        zkpVerifier = IZKPVerifier(zkpVerifierAddress);
    }

    // ============ FUNCTIONS UTAMA (sesuai Bagian B Kontrak Integrasi) ============

    function registerFreelancer(bytes calldata proof, bytes32 publicSignals) external returns (bool) {
        bool valid = zkpVerifier.verifyProof(proof, publicSignals);
        require(valid, "Proof ZKP tidak valid");

        verifiedCredential[msg.sender] = publicSignals;
        emit FreelancerRegistered(msg.sender, publicSignals);
        return true;
    }

    function postGig(uint256 amount) external payable returns (uint256) {
        require(msg.value == amount, "ETH yang dikirim harus sama dengan amount");
        require(amount > 0, "Amount harus lebih dari 0");

        uint256 gigId = nextGigId;

        gigs[gigId] = GigContract({
            employer: msg.sender,
            freelancer: address(0),
            amount: amount,
            credentialHash: bytes32(0),
            status: Status.Open,
            createdAt: block.timestamp
        });

        nextGigId++;
        emit GigPosted(gigId, msg.sender, amount);
        return gigId;
    }

    function acceptGig(uint256 gigId) external onlyValidStatus(gigId, Status.Open) returns (bool) {
        GigContract storage gig = gigs[gigId];
        require(gig.employer != msg.sender, "Employer tidak boleh accept gig sendiri");

        gig.freelancer = msg.sender;
        gig.status = Status.InProgress;

        emit GigAccepted(gigId, msg.sender);
        return true;
    }

    function submitWork(uint256 gigId, string calldata proofOfWorkURI)
        external
        onlyFreelancer(gigId)
        onlyValidStatus(gigId, Status.InProgress)
        returns (bool)
    {
        gigs[gigId].status = Status.Submitted;
        emit WorkSubmitted(gigId, proofOfWorkURI);
        return true;
    }

    function verifyAndRelease(uint256 gigId)
        external
        nonReentrant
        onlyEmployer(gigId)
        onlyValidStatus(gigId, Status.Submitted)
        returns (bool)
    {
        GigContract storage gig = gigs[gigId];

        // Checks-Effects-Interactions: ubah status dulu SEBELUM kirim ETH keluar,
        // supaya tidak bisa dieksploitasi lewat reentrancy attack
        gig.status = Status.Paid;
        uint256 amount = gig.amount;
        address payable freelancer = payable(gig.freelancer);

        (bool sent, ) = freelancer.call{value: amount}("");
        require(sent, "Transfer ETH ke freelancer gagal");

        emit PaymentReleased(gigId, gig.freelancer, amount);
        return true;
    }

    function raiseDispute(uint256 gigId) external returns (bool) {
        GigContract storage gig = gigs[gigId];
        require(
            msg.sender == gig.employer || msg.sender == gig.freelancer,
            "Hanya employer/freelancer gig ini yang boleh dispute"
        );
        require(
            gig.status == Status.InProgress || gig.status == Status.Submitted,
            "Gig tidak dalam status yang bisa di-dispute"
        );

        gig.status = Status.Disputed;
        emit DisputeRaised(gigId, msg.sender);
        return true;
    }

    function stake(uint256 amount) external payable returns (bool) {
        require(msg.value == amount, "ETH yang dikirim harus sama dengan amount");
        require(amount > 0, "Harus stake lebih dari 0");

        stakeBalance[msg.sender] += amount;
        emit Staked(msg.sender, amount);
        return true;
    }

    function unstake(uint256 amount) external nonReentrant returns (bool) {
        require(stakeBalance[msg.sender] >= amount, "Saldo stake tidak cukup");

        stakeBalance[msg.sender] -= amount;
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Transfer unstake gagal");

        emit Unstaked(msg.sender, amount);
        return true;
    }

    // ============ VIEW FUNCTIONS (read-only, gratis dipanggil) ============

    function getGig(uint256 gigId) external view returns (GigContract memory) {
        return gigs[gigId];
    }

    function getVerifiedCredential(address freelancer) external view returns (bytes32) {
        return verifiedCredential[freelancer];
    }

    function getStakeBalance(address validator) external view returns (uint256) {
        return stakeBalance[validator];
    }
}