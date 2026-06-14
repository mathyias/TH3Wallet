import { Buffer } from 'buffer'

globalThis.Buffer = Buffer

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

if (new URLSearchParams(window.location.search).get('extension') === 'chrome') {
  document.documentElement.dataset.extension = 'chrome'
}
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
