import { useState, useEffect, createContext, useContext } from 'react'
import { ethers } from 'ethers'
const Ctx = createContext(null)

// Sesuaikan kalau backend jalan di port/host lain
const API_BASE = 'http://localhost:3000'

// Minta user tanda tangan pesan tetap -> hasilnya dipakai sebagai "password" ke backend.
// Signature ECDSA deterministik untuk private key + pesan yang sama, jadi hasilnya konsisten setiap kali.
async function signAuthMessage(address) {
  const message = `Login ke ZFreelance sebagai ${address}`
  return window.ethereum.request({
    method: 'personal_sign',
    params: [message, address],
  })
}

// Login ke backend; kalau wallet belum terdaftar, register dulu otomatis, lalu login.
// Menyimpan token JWT ke localStorage supaya dipakai endpoint lain (misal upload IPFS).
async function backendAuth(address, role) {
  const signature = await signAuthMessage(address)

  let res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: address, password: signature }),
  })
  let data = await res.json()

  if (!res.ok) {
    if (data.error === 'Wallet tidak ditemukan') {
      const regRes = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          name: `User ${address.slice(0, 6)}`,
          password: signature,
          role: role || 'freelancer',
        }),
      })
      const regData = await regRes.json()
      if (!regRes.ok) throw new Error(regData.error || 'Registrasi backend gagal')

      res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, password: signature }),
      })
      data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login backend gagal')
    } else {
      throw new Error(data.error || 'Login backend gagal')
    }
  }

  localStorage.setItem('token', data.token)
  return data.token
}

export function WalletProvider({ children }) {
  const [account,  setAccount]  = useState(null)
  const [role,     setRole]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function connect() {
    setLoading(true); setError(null)
    try {
      if (!window.ethereum) throw new Error('Pasang MetaMask dulu.')
      try {
        await window.ethereum.request({ method:'wallet_switchEthereumChain', params:[{chainId:'0xaa36a7'}] })
      } catch(e) {
        if (e.code===4902) await window.ethereum.request({ method:'wallet_addEthereumChain', params:[{chainId:'0xaa36a7',chainName:'Sepolia Testnet',rpcUrls:['https://rpc.sepolia.org'],nativeCurrency:{name:'ETH',symbol:'ETH',decimals:18},blockExplorerUrls:['https://sepolia.etherscan.io']}] })
        else throw e
      }
      const accs = await window.ethereum.request({ method:'eth_requestAccounts' })
      setAccount(accs[0])
      const r = localStorage.getItem(`zf_role_${accs[0]}`)
      if (r) {
        setRole(r)
        // Kalau role sudah pernah disimpan tapi belum ada token backend, login ulang otomatis.
        if (!localStorage.getItem('token')) {
          try { await backendAuth(accs[0], r) } catch (e) { console.error('Backend auth gagal:', e.message) }
        }
      }
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  function disconnect() {
    setAccount(null); setRole(null)
    localStorage.removeItem('token')
  }

  function saveRole(addr, r) { localStorage.setItem(`zf_role_${addr}`, r); setRole(r) }

  useEffect(() => {
    if (!window.ethereum) return
    window.ethereum.request({method:'eth_accounts'}).then(async accs => {
      if (accs[0]) {
        setAccount(accs[0])
        const r = localStorage.getItem(`zf_role_${accs[0]}`)
        if (r) {
          setRole(r)
          if (!localStorage.getItem('token')) {
            try { await backendAuth(accs[0], r) } catch (e) { console.error('Backend auth gagal:', e.message) }
          }
        }
      }
    })
    window.ethereum.on('accountsChanged', accs => { setAccount(accs[0]||null); setRole(null); localStorage.removeItem('token') })
    window.ethereum.on('chainChanged', () => window.location.reload())
  }, [])

  return <Ctx.Provider value={{account,role,loading,error,connect,disconnect,saveRole,backendAuth}}>{children}</Ctx.Provider>
}
export const useWallet = () => useContext(Ctx)
