// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Interface ke contract Groth16Verifier hasil export snarkjs
// (signature ini HARUS sama persis dengan yang ada di verifier.sol hasil generate)
interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[1] calldata _pubSignals
    ) external view returns (bool);
}

// Adapter: menjembatani format proof Groth16Verifier (4 parameter terpisah)
// ke interface IZKPVerifier yang dipakai ZFreelance.sol (bytes proof, bytes32 publicSignals)
contract ZKPVerifierAdapter {
    IGroth16Verifier public immutable groth16Verifier;

    constructor(address groth16VerifierAddress) {
        groth16Verifier = IGroth16Verifier(groth16VerifierAddress);
    }

    // proof (bytes) harus di-encode di sisi off-chain (script generate proof) sebagai:
    // abi.encode(uint[2] a, uint[2][2] b, uint[2] c)
    // publicSignals (bytes32) adalah representasi credentialHash / public signal tunggal
    function verifyProof(bytes calldata proof, bytes32 publicSignals) external view returns (bool) {
        (uint[2] memory a, uint[2][2] memory b, uint[2] memory c) =
            abi.decode(proof, (uint[2], uint[2][2], uint[2]));

        uint[1] memory pubSignals;
        pubSignals[0] = uint256(publicSignals);

        return groth16Verifier.verifyProof(a, b, c, pubSignals);
    }
}