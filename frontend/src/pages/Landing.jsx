import { useNavigate } from 'react-router-dom'
import { useWallet } from '../hooks/useWallet'

export default function Landing() {
  const { account, connect, loading, error, role } = useWallet()
  const navigate = useNavigate()

  function handlePrimaryAction() {
    if (account) {
      navigate(role ? '/dashboard' : '/register')
      return
    }
    connect()
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-dark-600">
        <div><span className="font-mono font-bold text-brand-400 text-xl">Z</span><span className="font-semibold text-white text-xl">Freelance</span></div>
        <button onClick={handlePrimaryAction} disabled={loading} className="btn-primary text-sm">
          {loading ? 'Menghubungkan...' : account ? (role ? 'Masuk Dashboard' : 'Lanjutkan ke Register') : 'Connect Wallet'}
        </button>
      </nav>
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center max-w-3xl mx-auto">
        <div className="mb-6 inline-flex items-center gap-2 bg-brand-900 border border-brand-700 rounded-full px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
          <span className="text-brand-400 text-sm font-mono">Live on Sepolia Testnet</span>
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6">Freelance tanpa perantara,<br/><span className="text-brand-400">dibayar otomatis.</span></h1>
        <p className="text-gray-400 text-lg mb-10 leading-relaxed">ZFreelance menghubungkan freelancer dan employer lewat smart contract escrow — pembayaran otomatis, privasi sertifikasi dijaga Zero-Knowledge Proof.</p>
        <div className="flex gap-4 flex-wrap justify-center">
          <button onClick={connect} disabled={loading} className="btn-primary text-base px-8 py-4">{loading?'Menghubungkan...':'Mulai Sekarang'}</button>
          <a href="https://sepolia.etherscan.io/address/0xb5A3D20aA9C73E00bD38518594118638822dc307" target="_blank" rel="noopener noreferrer" className="btn-secondary text-base px-8 py-4">Lihat Contract ↗</a>
        </div>
        {error && <p className="mt-4 text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-xl px-4 py-3">{error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 text-left">
          {[{icon:'⚡',title:'Pembayaran Otomatis',desc:'Dana langsung cair ke freelancer begitu employer konfirmasi — tanpa delay 5 hari.'},{icon:'🔒',title:'Privasi Sertifikasi',desc:'Buktikan keahlianmu dengan ZKP tanpa membuka institusi asalmu.'},{icon:'🔗',title:'Transparan & Aman',desc:'Semua riwayat tercatat permanen on-chain, tidak bisa dimanipulasi.'}].map(f=>(
            <div key={f.title} className="card hover:border-brand-700 transition-colors">
              <span className="text-2xl mb-3 block">{f.icon}</span>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="text-center py-6 text-gray-600 text-sm border-t border-dark-600">ZFreelance — Tugas Besar PBP 2026</footer>
    </div>
  )
}