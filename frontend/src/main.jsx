import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WalletProvider, useWallet } from './hooks/useWallet'
import Landing   from './pages/Landing'
import Register  from './pages/Register'
import Dashboard from './pages/Dashboard'
import './index.css'
import { Buffer } from 'buffer'
window.Buffer = Buffer

function Guard({ children }) {
  const { account } = useWallet()
  return account ? children : <Navigate to="/" replace />
}
function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <Routes>
          <Route path="/"          element={<Landing />} />
          <Route path="/register"  element={<Guard><Register /></Guard>} />
          <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
        </Routes>
      </WalletProvider>
    </BrowserRouter>
  )
}
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)