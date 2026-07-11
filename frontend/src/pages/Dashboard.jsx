import { useState, useEffect } from 'react'
import { useWallet } from '../hooks/useWallet'
import { getContract, getProvider, STATUS_LABELS, STATUS_BADGE, shortenAddress, formatEth } from '../utils/contract'
import { ethers } from 'ethers'

// Sesuaikan kalau backend jalan di port/host lain
const API_BASE = 'http://localhost:3000'

export default function Dashboard() {
  const { account, role, disconnect } = useWallet()
  const [gigs, setGigs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [txLoading, setTxLoading] = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)
  const [gigAmount, setGigAmount] = useState('')
  const [activeGigId, setActiveGigId] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  async function loadGigs() {
    setLoading(true); setError(null)
    try {
      const contract = await getContract()
      const nextId = await contract.nextGigId()
      const loaded = []
      for (let i = 0; i < Number(nextId); i++) {
        const gig = await contract.getGig(i)
        const status = Number(gig.status)

        // proofOfWorkURI tidak disimpan di storage kontrak, cuma di-emit sebagai event.
        // Ambil dari event log kalau gig sudah pernah di-submit (status >= Submitted).
        let workUri = null
        if (status >= 2) {
          try {
            const provider = await getProvider()
            const latestBlock = await provider.getBlockNumber()
            const fromBlock = Math.max(0, latestBlock - 9000) // RPC publik biasanya batasi max 10.000 block per query
            const events = await contract.queryFilter(contract.filters.WorkSubmitted(i), fromBlock, latestBlock)
            if (events.length > 0) workUri = events[events.length - 1].args.proofOfWorkURI
          } catch (e) { console.error(`Gagal ambil workUri gig #${i}:`, e.message) }
        }

        loaded.push({ id:i, employer:gig.employer, freelancer:gig.freelancer, amount:gig.amount, status, createdAt:Number(gig.createdAt), workUri })
      }
      setGigs(loaded)
    } catch(err) { setError('Gagal memuat gig: ' + err.message) }
    finally { setLoading(false) }
  }

  // ipfs://<CID> tidak bisa dibuka langsung di browser, konversi ke URL gateway HTTPS
  function toGatewayUrl(uri) {
    if (!uri) return '#'
    return uri.startsWith('ipfs://')
      ? `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`
      : uri
  }

  useEffect(() => { if (account) loadGigs() }, [account])

  async function postGig() {
    if (!gigAmount || parseFloat(gigAmount) <= 0) return
    setTxLoading(true); setError(null); setSuccess(null)
    try {
      const contract = await getContract(true)
      const amount = ethers.parseEther(gigAmount)
      const tx = await contract.postGig(amount, { value: amount })
      await tx.wait()
      setSuccess('Gig berhasil diposting! Dana terkunci di escrow.')
      setGigAmount(''); await loadGigs()
    } catch(err) { setError(err.message) }
    finally { setTxLoading(false) }
  }

  async function acceptGig(gigId) {
    setTxLoading(true); setError(null); setSuccess(null)
    try {
      const tx = await (await getContract(true)).acceptGig(gigId)
      await tx.wait()
      setSuccess(`Gig #${gigId} berhasil diterima!`); await loadGigs()
    } catch(err) { setError(err.message) }
    finally { setTxLoading(false) }
  }

  // Upload file ke backend (-> Pinata/IPFS), lalu submit URI hasilnya ke smart contract
  async function uploadAndSubmitWork(gigId) {
    if (!selectedFile) return
    setUploading(true); setError(null); setSuccess(null)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Kamu belum login ke backend. Silakan login dulu sebelum submit kerja.')
      }

      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch(`${API_BASE}/api/work/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload ke IPFS gagal')
      }

      const workUri = data.proofOfWorkURI
      setUploading(false)

      // Lanjut submit URI ke smart contract
      setTxLoading(true)
      const tx = await (await getContract(true)).submitWork(gigId, workUri)
      await tx.wait()
      setSuccess(`Hasil kerja Gig #${gigId} berhasil disubmit! (${workUri})`)
      setSelectedFile(null); setActiveGigId(null); await loadGigs()
    } catch(err) {
      setError(err.message)
    } finally {
      setUploading(false); setTxLoading(false)
    }
  }

  async function verifyAndRelease(gigId) {
    setTxLoading(true); setError(null); setSuccess(null)
    try {
      const tx = await (await getContract(true)).verifyAndRelease(gigId)
      await tx.wait()
      setSuccess(`Pembayaran Gig #${gigId} berhasil dikirim ke freelancer! 🎉`); await loadGigs()
    } catch(err) { setError(err.message) }
    finally { setTxLoading(false) }
  }

  async function raiseDispute(gigId) {
    setTxLoading(true); setError(null); setSuccess(null)
    try {
      const tx = await (await getContract(true)).raiseDispute(gigId)
      await tx.wait()
      setSuccess(`Dispute Gig #${gigId} berhasil diajukan.`); await loadGigs()
    } catch(err) { setError(err.message) }
    finally { setTxLoading(false) }
  }

  const myGigs = role === 'employer'
    ? gigs.filter(g => g.employer.toLowerCase() === account?.toLowerCase())
    : gigs.filter(g => g.freelancer.toLowerCase() === account?.toLowerCase() || (g.status === 0 && g.employer.toLowerCase() !== account?.toLowerCase()))

  return (
    <div className="min-h-screen bg-dark-900">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-dark-600">
        <div>
          <span className="font-mono font-bold text-brand-400 text-xl">Z</span>
          <span className="font-semibold text-white text-xl">Freelance</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 font-mono">{shortenAddress(account)}</span>
          <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${role==='employer'?'bg-blue-900 text-blue-300':'bg-brand-900 text-brand-400'}`}>{role}</span>
          <button onClick={disconnect} className="btn-secondary text-sm py-2 px-4">Disconnect</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {error   && <div className="mb-6 text-red-400 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm">{error}</div>}
        {success && <div className="mb-6 text-brand-400 bg-brand-900/30 border border-brand-700 rounded-xl px-4 py-3 text-sm">{success}</div>}

        {role === 'employer' && (
          <div className="card mb-8">
            <h2 className="text-lg font-semibold mb-4">Post Gig Baru</h2>
            <div className="flex gap-3">
              <input type="number" step="0.001" value={gigAmount} onChange={e => setGigAmount(e.target.value)}
                placeholder="Jumlah ETH (misal: 0.05)" className="input-field flex-1 font-mono" />
              <button onClick={postGig} disabled={txLoading || !gigAmount} className="btn-primary whitespace-nowrap">
                {txLoading ? 'Memproses...' : 'Post & Lock Escrow'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Dana dikunci di smart contract sampai kamu approve hasil kerja freelancer.</p>
          </div>
        )}

        <h2 className="text-lg font-semibold mb-4">{role==='employer'?'Gig Kamu':'Gig Tersedia & Gig Kamu'}</h2>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Memuat gig dari blockchain...</div>
        ) : myGigs.length === 0 ? (
          <div className="text-center py-20 card text-gray-400">
            {role==='employer'?'Belum ada gig. Post gig pertamamu di atas!':'Belum ada gig tersedia.'}
          </div>
        ) : (
          <div className="space-y-4">
            {myGigs.map(gig => (
              <div key={gig.id} className="card hover:border-dark-500 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-gray-400 text-xs">Gig #{gig.id}</span>
                    <span className={`ml-3 ${STATUS_BADGE[gig.status]}`}>{STATUS_LABELS[gig.status]}</span>
                  </div>
                  <span className="font-mono font-bold text-brand-400">{formatEth(gig.amount)}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-1 mb-4 font-mono">
                  <p>Employer: {shortenAddress(gig.employer)}</p>
                  {gig.freelancer !== ethers.ZeroAddress && <p>Freelancer: {shortenAddress(gig.freelancer)}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {role==='freelancer' && gig.status===0 && (
                    <button onClick={() => acceptGig(gig.id)} disabled={txLoading} className="btn-primary text-sm py-2">Accept Gig</button>
                  )}
                  {role==='freelancer' && gig.status===1 && gig.freelancer.toLowerCase()===account?.toLowerCase() && (
                    <div className="flex flex-col gap-2 w-full">
                      <input
                        type="file"
                        onChange={e => { setSelectedFile(e.target.files[0]); setActiveGigId(gig.id) }}
                        className="text-sm text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-dark-600 file:text-white file:text-sm"
                      />
                      <button
                        onClick={() => uploadAndSubmitWork(gig.id)}
                        disabled={txLoading || uploading || !selectedFile || activeGigId !== gig.id}
                        className="btn-primary text-sm py-2 whitespace-nowrap self-start"
                      >
                        {uploading ? 'Mengunggah ke IPFS...' : txLoading ? 'Mengirim ke blockchain...' : 'Upload & Submit Kerja'}
                      </button>
                    </div>
                  )}
                  {gig.workUri && gig.status >= 2 && (gig.employer.toLowerCase()===account?.toLowerCase() || gig.freelancer.toLowerCase()===account?.toLowerCase()) && (
                    <a href={toGatewayUrl(gig.workUri)} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary text-sm py-2 whitespace-nowrap">📄 Lihat Hasil Kerja</a>
                  )}
                  {role==='employer' && gig.status===2 && gig.employer.toLowerCase()===account?.toLowerCase() && (
                    <button onClick={() => verifyAndRelease(gig.id)} disabled={txLoading} className="btn-primary text-sm py-2">✅ Approve & Bayar</button>
                  )}
                  {(gig.status===1||gig.status===2) && (gig.employer.toLowerCase()===account?.toLowerCase()||gig.freelancer.toLowerCase()===account?.toLowerCase()) && (
                    <button onClick={() => raiseDispute(gig.id)} disabled={txLoading} className="btn-danger text-sm py-2">Ajukan Dispute</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
