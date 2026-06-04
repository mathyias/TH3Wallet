import { useState, useEffect } from 'react'
import { generateTH3Address, sendTH3Transaction, getTH3WIF } from './lib/th3'
import * as bip39 from 'bip39'
import CryptoJS from 'crypto-js'
import { QRCode } from 'react-qr-code'
import './App.css'

const TX_FEE_TH3 = 0.01
const EXPLORER_TX_BASE = 'https://explorer.th3chain.cloud/tx'

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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sendTo, setSendTo] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [lastTxid, setLastTxid] = useState('')
  const [showSeed, setShowSeed] = useState(false)

  const amount = Number(sendAmount)
  const maxSend = Math.max(balance - TX_FEE_TH3, 0)
  const totalSendCost = Number.isFinite(amount) && amount > 0 ? amount + TX_FEE_TH3 : TX_FEE_TH3

  const showErr = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 5000)
  }

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 8000)
  }

  const loadWallet = async () => {
    if (!address || !isUnlocked) return

    try {
      const balanceRes = await fetch(
        `https://api.th3chain.cloud/api/address/${address}`
      )

      const balanceData = await balanceRes.json()
      setBalance(balanceData.balance || 0)

      const txsRes = await fetch(
        `https://api.th3chain.cloud/api/address/${address}/txs`
      )

      const ids = await txsRes.json()

      if (!Array.isArray(ids)) return

      const details = await Promise.all(
        ids.map((txid: string) =>
          fetch(
            `https://api.th3chain.cloud/api/tx/${txid}`
          ).then((r) => r.json())
        )
      )

      setTxs(details.reverse())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (!address || !isUnlocked) return

    loadWallet()

    const interval = setInterval(
      loadWallet,
      10000
    )

    return () => clearInterval(interval)
  }, [address, isUnlocked])

  const finalizeSetup = async () => {
    if (password.length < 6) {
      return showErr('Password min. 6 characters')
    }

    if (!tempSeed || tempSeed.split(' ').length < 12) {
      return showErr('Invalid seed phrase')
    }

    try {
      const enc = CryptoJS.AES.encrypt(tempSeed, password).toString()
      const addr = await generateTH3Address(tempSeed)

      localStorage.setItem('th3_encrypted_seed', enc)
      localStorage.setItem('th3_address', addr)

      setAddress(addr)
      setSeed(tempSeed)
      setIsUnlocked(true)
    } catch {
      showErr('Wallet save failed')
    }
  }

  const unlockWallet = () => {
    const enc = localStorage.getItem('th3_encrypted_seed')

    try {
      const bytes = CryptoJS.AES.decrypt(enc!, password)
      const decrypted = bytes.toString(CryptoJS.enc.Utf8)

      if (decrypted) {
        setIsUnlocked(true)
        setSeed(decrypted)
        setPassword('')
      } else {
        showErr('Wrong password')
      }
    } catch {
      showErr('Unlock failed')
    }
  }

  const useMaxAmount = () => {
    setSendAmount(maxSend.toFixed(8))
  }

  const sendTH3 = async () => {
    try {
      if (isSending) return

      if (!seed) {
        return showErr('Wallet is locked')
      }

      if (!sendTo.startsWith('T')) {
        return showErr('Invalid TH3 address')
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return showErr('Invalid amount')
      }

      if (amount + TX_FEE_TH3 > balance) {
        return showErr(`Insufficient balance. Max send is ${maxSend.toFixed(8)} TH3`)
      }

      setIsSending(true)
      setLastTxid('')

      const result = await sendTH3Transaction({
        seed,
        fromAddress: address,
        toAddress: sendTo,
        amount
      })

      setLastTxid(result.txid)
      showSuccess(`Transaction sent: ${result.txid.slice(0, 12)}...${result.txid.slice(-8)}`)

      setSendTo('')
      setSendAmount('')

      await loadWallet()
    } catch (err) {
      showErr(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="app-wrapper">
      <div className="glass-box">
        <header>
          <h1>TH3 Wallet</h1>
        </header>

        {error && (
          <div className="error-msg">
            {error}
          </div>
        )}

        {success && (
          <div className="success-msg">
            {success}
            {lastTxid && (
              <div style={{ marginTop: 8 }}>
                <a
                  href={`${EXPLORER_TX_BASE}/${lastTxid}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View transaction
                </a>
              </div>
            )}
          </div>
        )}

        {!isUnlocked ? (
          <div>
            {address ? (
              <>
                <input
                  type="password"
                  placeholder="Enter password"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button onClick={unlockWallet}>
                  Unlock
                </button>
              </>
            ) : (
              <>
                {view === 'login' && (
                  <>
                    <button
                      onClick={() => {
                        setTempSeed(bip39.generateMnemonic())
                        setView('create-show')
                      }}
                      style={{ marginBottom: '10px' }}
                    >
                      Create
                    </button>

                    <button
                      className="reset-btn"
                      onClick={() => setView('import-input')}
                    >
                      Import
                    </button>
                  </>
                )}

                {view === 'create-show' && (
                  <>
                    <p className="label">
                      Save your seed phrase:
                    </p>

                    <div className="seed-box">
                      {tempSeed}
                    </div>

                    <button
                      onClick={() => setView('set-pass')}
                      style={{ marginTop: '15px' }}
                    >
                      Saved
                    </button>
                  </>
                )}

                {view === 'import-input' && (
                  <>
                    <input
                      type="text"
                      placeholder="Paste seed phrase"
                      onChange={(e) => setTempSeed(e.target.value)}
                    />

                    <button
                      onClick={() => {
                        if (!tempSeed) return showErr('Enter seed phrase')
                        setView('set-pass')
                      }}
                    >
                      Next
                    </button>
                  </>
                )}

                {view === 'set-pass' && (
                  <>
                    <input
                      type="password"
                      placeholder="Set password"
                      onChange={(e) => setPassword(e.target.value)}
                    />

                    <button onClick={finalizeSetup}>
                      Confirm
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="nav-bar">
              <span
                className={activeTab === 'send' ? 'active' : ''}
                onClick={() => setActiveTab('send')}
              >
                Send
              </span>

              <span
                className={activeTab === 'wallet' ? 'active' : ''}
                onClick={() => setActiveTab('wallet')}
              >
                Wallet
              </span>

              <span
                className={activeTab === 'txs' ? 'active' : ''}
                onClick={() => setActiveTab('txs')}
              >
                History
              </span>

              <span
                className={activeTab === 'sec' ? 'active' : ''}
                onClick={() => setActiveTab('sec')}
              >
                Security
              </span>
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

                  <div
                    style={{
                      marginTop: 20,
                      display: 'flex',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        background: '#fff',
                        padding: 12,
                        borderRadius: 16
                      }}
                    >
                      <QRCode
                        value={address}
                        size={150}
                      />
                    </div>
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
                      Copy
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
  type="button"
  onClick={useMaxAmount}
  disabled={maxSend <= 0 || isSending}
  style={{
    marginTop: '8px',
    background: 'rgba(255, 255, 255, 0.12)',
    color: 'rgba(255, 255, 255, 0.82)',
    border: '1px solid rgba(255, 255, 255, 0.18)'
  }}
>
  Max {maxSend.toFixed(8)} TH3
</button>

<button
  disabled={balance <= 0 || isSending}
  onClick={sendTH3}
  style={{
    marginTop: '14px'
  }}
>
  {isSending ? 'Sending...' : 'Send TH3'}
</button>

                <div
                  style={{
                    marginTop: '15px',
                    fontSize: '12px',
                    opacity: 0.7
                  }}
                >
                  Available Balance: {Number(balance).toFixed(8)} TH3
                </div>

                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    opacity: 0.7
                  }}
                >
                  Network Fee: {TX_FEE_TH3.toFixed(8)} TH3
                </div>

<div
  style={{
    marginTop: '12px',
    padding: '10px 12px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: '12px'
  }}
>
  Total: {totalSendCost.toFixed(8)} TH3
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
                        {tx.vout?.[0]?.value ?? 0} TH3
                      </div>

                      <div
                        style={{
                          fontSize: '10px',
                          opacity: 0.7
                        }}
                      >
                        {tx.confirmations ?? 0} confirmations
                      </div>

                      <div
                        style={{
                          fontSize: '10px',
                          opacity: 0.6
                        }}
                      >
                        {tx.time ? new Date(tx.time * 1000).toLocaleString() : 'Pending'}
                      </div>

                      <div
                        style={{
                          fontSize: '10px',
                          opacity: 0.5,
                          wordBreak: 'break-all'
                        }}
                      >
                        {tx.txid.slice(0, 12)}...{tx.txid.slice(-8)}
                      </div>

                      <div style={{ marginTop: 6 }}>
                        <a
                          href={`${EXPLORER_TX_BASE}/${tx.txid}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'sec' && (
              <>
                {!showSeed ? (
                  <button onClick={() => setShowSeed(true)}>
                    Reveal Seed Phrase
                  </button>
                ) : (
                  
                  <>
                    <div className="seed-box">
                      {seed}
                    </div>

                    <button onClick={() => setShowSeed(false)}>
                      Hide Seed Phrase
                    </button>
                  </>
                )}
              </>
            )}

            <button
              className="reset-btn"
              onClick={() => {
                localStorage.clear()
                window.location.reload()
              }}
            >
              Delete Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App