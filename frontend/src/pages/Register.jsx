import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'
import { shortenAddress, getContract } from '../utils/contract'
import { ethers } from 'ethers'

export default function Register() {
  const { account, saveRole, backendAuth } = useWallet()
  const navigate = useNavigate()
  const [role, setRole]         = useState(null)
  const [certSecret, setCertSecret] = useState('')
  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError]       = useState(null)

  async function handleSubmit() {
    setLoading(true); setError(null)
    try {
      if (role === 'employer') {
        setStatusMsg('Menghubungkan akun ke backend...')
        await backendAuth(account, 'employer')
        saveRole(account, 'employer')
        navigate('/dashboard')
        return
      }
      setStep(3); setStatusMsg('Menghitung Poseidon hash...')
      const circomlibjs = await import('circomlibjs')
      const poseidon = await circomlibjs.buildPoseidon()
      const secretBigInt = BigInt(certSecret)
      const hashRaw = poseidon([secretBigInt])
      const credentialHashBigInt = poseidon.F.toObject(hashRaw)

      setStatusMsg('Generating Zero-Knowledge Proof...')
      const snarkjs = await import('snarkjs')
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        { certificateSecret: secretBigInt.toString(), credentialHash: credentialHashBigInt.toString() },
        '/circuits/certificateProof.wasm',
        '/circuits/certificateProof_final.zkey'
      )
      setStatusMsg('Memformat proof untuk smart contract...')
      const callDataStr = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals)
      const [a, b, c, pubSignalsArr] = JSON.parse('[' + callDataStr + ']')
      const abiCoder = ethers.AbiCoder.defaultAbiCoder()
      const encodedProof = abiCoder.encode(['uint256[2]','uint256[2][2]','uint256[2]'], [a, b, c])
      const credentialHashBytes32 = ethers.zeroPadValue(ethers.toBeHex(BigInt(pubSignalsArr[0])), 32)

      setStatusMsg('Memanggil registerFreelancer() di smart contract...')
      const contract = await getContract(true)
      const tx = await contract.registerFreelancer(encodedProof, credentialHashBytes32)
      await tx.wait()

      setStatusMsg('Menghubungkan akun ke backend...')
      await backendAuth(account, 'freelancer')

      saveRole(account, 'freelancer')
      setStep(4); setStatusMsg('Registrasi berhasil!')
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch(err) {
      setError(err.message || 'Terjadi kesalahan.')
      setStep(role === 'freelancer' ? 2 : 1)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="font-mono font-bold text-brand-400 text-2xl">Z</span>
          <span className="font-semibold text-white text-2xl">Freelance</span>
          <p className="text-gray-400 mt-2 text-sm font-mono">{shortenAddress(account)}</p>
        </div>
        <div className="card">
          {step === 1 && (
            <>
              <h2 className="text-xl font-semibold mb-1">Pilih peran kamu</h2>
              <p className="text-gray-400 text-sm mb-6">Kamu mendaftar sebagai apa?</p>
              <div className="grid grid-cols-2 gap-4">
                {['employer','freelancer'].map(r => (
                  <button key={r} onClick={() => { setRole(r); setStep(2) }}
                    className="p-5 rounded-xl border-2 border-dark-600 hover:border-brand-500 text-left transition-all">
                    <span className="text-2xl mb-2 block">{r==='employer'?'💼':'🧑‍💻'}</span>
                    <p className="font-semibold capitalize">{r}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {r==='employer'?'Posting pekerjaan & bayar freelancer':'Cari kerja & terima pembayaran'}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="text-gray-400 text-sm mb-4 hover:text-white">← Kembali</button>
              <h2 className="text-xl font-semibold mb-4 capitalize">{role}</h2>
              {role === 'freelancer' && (
                <div className="mb-6">
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                    Masukkan kode unik sertifikat keahlianmu. Akan diproses dengan
                    <span className="text-brand-400 font-mono"> Zero-Knowledge Proof</span> —
                    smart contract hanya tahu kamu punya sertifikat valid, tanpa melihat kode aslinya.
                  </p>
                  <label className="text-sm text-gray-300 mb-2 block">Kode Sertifikat (angka)</label>
                  <input type="number" value={certSecret} onChange={e => setCertSecret(e.target.value)}
                    placeholder="contoh: 123456789" className="input-field font-mono" />
                  <p className="text-xs text-gray-500 mt-2">⚠️ Simpan kode ini — kamu akan butuhkan lagi untuk login.</p>
                </div>
              )}
              {role === 'employer' && (
                <p className="text-gray-400 text-sm mb-6">Akun employer tidak memerlukan sertifikasi. Wallet kamu akan langsung terdaftar.</p>
              )}
              {error && <p className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 mb-4">{error}</p>}
              <button onClick={handleSubmit} disabled={loading || (role==='freelancer' && !certSecret)} className="btn-primary w-full">
                {loading ? 'Memproses...' : 'Daftar Sekarang'}
              </button>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white font-medium mb-2">Memproses ZKP...</p>
              <p className="text-gray-400 text-sm">{statusMsg}</p>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-white font-semibold text-lg mb-2">Registrasi Berhasil!</p>
              <p className="text-gray-400 text-sm">{statusMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
