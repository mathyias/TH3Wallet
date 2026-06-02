import { useState, useEffect } from 'react'
import { generateTH3Address } from './lib/th3'
import * as bip39 from 'bip39'
import CryptoJS from 'crypto-js'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('wallet')
  const [address, setAddress] = useState(localStorage.getItem('th3_address') || '')
  const [balance, setBalance] = useState(0)
  const [txs, setTxs] = useState<string[]>([])
  const [password, setPassword] = useState('')
  const [tempSeed, setTempSeed] = useState('')
  const [seed, setSeed] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [view, setView] = useState<'login' | 'create-show' | 'import-input' | 'set-pass'>('login')
  const [error, setError] = useState('') // Stan błędu

  // Funkcja pomocnicza do błędów
  const showErr = (msg: string) => { setError(msg); setTimeout(() => setError(''), 3000); }

  useEffect(() => {
    if (address && isUnlocked) {
      fetch(`https://api.th3chain.cloud/api/address/${address}`).then(r => r.json()).then(d => setBalance(d.balance || 0)).catch(console.error)
      fetch(`https://api.th3chain.cloud/api/address/${address}/txs`).then(r => r.json()).then(d => setTxs(Array.isArray(d) ? d : [])).catch(console.error)
    }
  }, [address, isUnlocked])

  const finalizeSetup = async () => {
    if (password.length < 6) return showErr("Hasło min. 6 znaków!")
    if (!tempSeed || tempSeed.split(' ').length < 12) return showErr("Błędna fraza!")
    try {
      const enc = CryptoJS.AES.encrypt(tempSeed, password).toString()
      const addr = await generateTH3Address(tempSeed)
      localStorage.setItem('th3_encrypted_seed', enc)
      localStorage.setItem('th3_address', addr)
      setAddress(addr); setSeed(tempSeed); setIsUnlocked(true);
    } catch { showErr("Błąd zapisu portfela") }
  }

  const unlockWallet = () => {
    const enc = localStorage.getItem('th3_encrypted_seed')
    try {
      const bytes = CryptoJS.AES.decrypt(enc!, password)
      const decrypted = bytes.toString(CryptoJS.enc.Utf8)
      if (decrypted) { setIsUnlocked(true); setSeed(decrypted); setPassword(''); }
      else { showErr("Złe hasło!") }
    } catch { showErr("Błąd odblokowania") }
  }

  return (
    <div className="app-wrapper">
      <div className="glass-box">
        <header><h1>TH3 Wallet</h1></header>
        
        {error && <div className="error-msg">{error}</div>}

        {!isUnlocked ? (
          <div>
            {address ? (
              <>
                <input type="password" placeholder="Wpisz hasło" onChange={(e) => setPassword(e.target.value)} />
                <button onClick={unlockWallet}>Unlock</button>
              </>
            ) : (
              <>
                {view === 'login' && (
                  <>
                    <button onClick={() => {setTempSeed(bip39.generateMnemonic()); setView('create-show');}} style={{marginBottom:'10px'}}>Create</button>
                    <button className="reset-btn" onClick={() => setView('import-input')}>Import</button>
                  </>
                )}
                {view === 'create-show' && (
                  <>
                    <p className="label">Zapisz frazę:</p>
                    <div className="seed-box">{tempSeed}</div>
                    <button onClick={() => setView('set-pass')} style={{marginTop:'15px'}}>Zapisano</button>
                  </>
                )}
                {view === 'import-input' && (
                  <>
                    <input type="text" placeholder="Wklej frazę seed" onChange={(e) => setTempSeed(e.target.value)} />
                    <button onClick={() => {if(!tempSeed) return showErr("Wpisz frazę!"); setView('set-pass');}}>Dalej</button>
                  </>
                )}
                {view === 'set-pass' && (
                  <>
                    <input type="password" placeholder="Ustaw hasło" onChange={(e) => setPassword(e.target.value)} />
                    <button onClick={finalizeSetup}>Confirm</button>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="nav-bar">
              <span className={activeTab === 'wallet' ? 'active' : ''} onClick={() => setActiveTab('wallet')}>Wallet</span>
              <span className={activeTab === 'txs' ? 'active' : ''} onClick={() => setActiveTab('txs')}>History</span>
              <span className={activeTab === 'sec' ? 'active' : ''} onClick={() => setActiveTab('sec')}>Security</span>
            </div>
            {activeTab === 'wallet' && (
              <table className="data-table"><tbody>
                <tr><td className="label">ADDR</td><td className="value">{address}</td></tr>
                <tr><td className="label">BAL</td><td className="value">{balance} TH3</td></tr>
              </tbody></table>
            )}
            {activeTab === 'txs' && <div className="scroll-area">{txs.map((t, i) => <div key={i} className="tx-item">{t} TH3</div>)}</div>}
            {activeTab === 'sec' && <div className="seed-box">{seed}</div>}
            <button className="reset-btn" onClick={() => {localStorage.clear(); window.location.reload()}}>Delete Wallet</button>
          </div>
        )}
      </div>
    </div>
  )
}
export default App