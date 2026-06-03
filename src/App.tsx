import { useState, useEffect } from 'react'
import { generateTH3Address } from './lib/th3'
import * as bip39 from 'bip39'
import CryptoJS from 'crypto-js'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('wallet')
  const [address, setAddress] = useState(localStorage.getItem('th3_address') || '')
  const [balance, setBalance] = useState(0)
  const [txs, setTxs] = useState<any[]>([])
  const [password, setPassword] = useState('')
  const [tempSeed, setTempSeed] = useState('')
  const [seed, setSeed] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [view, setView] = useState<'login' | 'create-show' | 'import-input' | 'set-pass'>('login')
  const [error, setError] = useState('') // Stan błędu
  const [sendTo, setSendTo] = useState('')
  const [sendAmount, setSendAmount] = useState('')

  

  // Funkcja pomocnicza do błędów
  const showErr = (msg: string) => { setError(msg); setTimeout(() => setError(''), 3000); }

  useEffect(() => {
    if (address && isUnlocked) {
      fetch(`https://api.th3chain.cloud/api/address/${address}`).then(r => r.json()).then(d => setBalance(d.balance || 0)).catch(console.error)
      fetch(`https://api.th3chain.cloud/api/address/${address}/txs`)
  .then(r => r.json())
  .then(async (ids) => {
    if (!Array.isArray(ids)) return

    const details = await Promise.all(
      ids.map((txid: string) =>
        fetch(
          `https://api.th3chain.cloud/api/tx/${txid}`
        ).then(r => r.json())
      )
    )

    setTxs(details)
  })
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

  const sendTH3 = async () => {
  try {
    if (!sendTo.startsWith('T')) {
      return showErr('Invalid TH3 address')
    }

    const response = await fetch(
      'https://api.th3chain.cloud/api/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address: sendTo,
          amount: Number(sendAmount)
        })
      }
    )

    const data = await response.json()

    if (data.error) {
      return showErr(data.error)
    }

    alert(`Transaction sent!\n${data.txid}`)

    setSendTo('')
    setSendAmount('')

  } catch (err) {
    showErr('Send failed')
  }
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

              <span className={activeTab === 'send' ? 'active' : ''} onClick={() => setActiveTab('send')}>Send</span>
              <span className={activeTab === 'wallet' ? 'active' : ''} onClick={() => setActiveTab('wallet')}>Wallet</span>

              <span className={activeTab === 'txs' ? 'active' : ''} onClick={() => setActiveTab('txs')}>History</span>
              <span className={activeTab === 'sec' ? 'active' : ''} onClick={() => setActiveTab('sec')}>Security</span>
            </div>
            {activeTab === 'wallet' && (
  <>
    <div className="balance-card">
      <div className="balance-label">
        Available Balance
      </div>

      <div className="balance-value">
        {Number(balance).toFixed(8)}
      </div>

      <div className="balance-unit">
        TH3
      </div>
    </div>

    <div className="wallet-address">
      <div className="wallet-address-label">
        Wallet Address
      </div>

      <div className="wallet-address-row">
        <span title={address}>
          {address}
        </span>

        <button
          type="button"
          className="copy-btn"
          onClick={() => navigator.clipboard.writeText(address)}
        >
          📋
        </button>
      </div>
    </div>
  </>
)}

{activeTab === 'send' && (
  <>
    <input
      type="text"
      placeholder="Recipient Address"
      value={sendTo}
      onChange={(e) => setSendTo(e.target.value)}
    />

    <input
      type="number"
      placeholder="Amount TH3"
      value={sendAmount}
      onChange={(e) => setSendAmount(e.target.value)}
    />

  <button
  disabled={balance <= 0}
  onClick={sendTH3}
>
  Send TH3
</button>

    <div
      style={{
        marginTop: '15px',
        fontSize: '12px',
        opacity: 0.7
      }}
    >
      Available Balance:
      {' '}
      {Number(balance).toFixed(8)}
      {' '}
      TH3
    </div>

    {balance <= 0 && (
  <div
    style={{
      marginTop: '10px',
      fontSize: '12px',
      opacity: 0.7
    }}
  >
    Mining rewards are maturing.
  </div>
)}
  </>
)}

            {activeTab === 'txs' && (
  <div className="scroll-area">
    {txs.length === 0 ? (
      <div className="tx-item">
        No transactions yet
      </div>
    ) : (
      txs.map((tx, i) => (
        <div
          key={i}
          className="tx-item"
        >
          <div>
            +{
              tx.vout?.[0]?.value ??
              0
            } TH3
          </div>

          <div
            style={{
              fontSize: '10px',
              opacity: 0.7
            }}
          >
            {tx.confirmations}
            {' '}
            confirmations
          </div>

          <div
            style={{
              fontSize: '10px',
              opacity: 0.5,
              wordBreak: 'break-all'
            }}
          >
            {tx.txid}
          </div>
        </div>
      ))
    )}
  </div>
)}
            {activeTab === 'sec' && <div className="seed-box">{seed}</div>}
            <button className="reset-btn" onClick={() => {localStorage.clear(); window.location.reload()}}>Delete Wallet</button>
          </div>
        )}
      </div>
    </div>
  )
}
export default App