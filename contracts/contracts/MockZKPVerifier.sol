// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Verifier tiruan HANYA untuk testing — selalu mengembalikan "valid"
// Nanti diganti dengan verifier.sol asli hasil compile snarkjs di tahap ZKP
contract MockZKPVerifier {
    function verifyProof(bytes calldata, bytes32) external pure returns (bool) {
        return true;
    }
}