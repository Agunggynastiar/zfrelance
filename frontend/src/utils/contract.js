import { ethers } from 'ethers'
let _abi = null
export async function getAbiData() {
  if (_abi) return _abi
  const res = await fetch('/ZFreelance.json')
  _abi = await res.json()
  return _abi
}
export async function getProvider() {
  if (!window.ethereum) throw new Error('MetaMask tidak ditemukan.')
  return new ethers.BrowserProvider(window.ethereum)
}
export async function getSigner() {
  return (await getProvider()).getSigner()
}
export async function getContract(withSigner = false) {
  const d = await getAbiData()
  const runner = withSigner ? await getSigner() : await getProvider()
  return new ethers.Contract(d.contractAddress, d.abi, runner)
}
export const STATUS_LABELS = {0:'Open',1:'InProgress',2:'Submitted',3:'Verified',4:'Paid',5:'Disputed'}
export const STATUS_BADGE  = {0:'badge-open',1:'badge-progress',2:'badge-submitted',3:'badge-submitted',4:'badge-paid',5:'badge-disputed'}
export const shortenAddress = a => a ? a.slice(0,6)+'...'+a.slice(-4) : ''
export const formatEth      = w => ethers.formatEther(w) + ' ETH'