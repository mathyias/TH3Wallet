# TH3WalletPage

Browser wallet frontend for TH3Chain.

## Live site

https://wallet.th3chain.cloud

## Features

- Create wallet from seed phrase
- Import existing seed phrase
- Password-protected local wallet storage
- TH3 address generation
- QR code display
- Balance and history
- UTXO-based send flow
- Local transaction signing
- Broadcast through TH3 API
- Explorer transaction links

## Security model

The seed phrase and private key stay in the browser. Transactions are built and signed locally before the signed raw transaction is sent to the TH3 API for broadcast.

## Build


```bash
npm install
npm run build
```

## API dependency

https://api.th3chain.cloud
