pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";

// Circuit ini membuktikan: "aku tahu kode rahasia sertifikat
// yang kalau di-hash, hasilnya sama dengan credentialHash yang tersimpan on-chain"
// — TANPA membuka kode rahasianya sendiri.
template CertificateProof() {
    signal input certificateSecret;  // PRIVATE: kode rahasia sertifikat freelancer
    signal input credentialHash;     // PUBLIC: hash yang sudah tersimpan di smart contract

    component hasher = Poseidon(1);
    hasher.inputs[0] <== certificateSecret;

    // Constraint utama: hash dari secret HARUS sama dengan credentialHash publik
    credentialHash === hasher.out;
}

component main { public [credentialHash] } = CertificateProof();