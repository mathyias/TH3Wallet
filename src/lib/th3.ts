import * as bip39 from 'bip39'
import { HDKey } from '@scure/bip32'
import { sha256 } from '@noble/hashes/sha2.js'
import { ripemd160 } from '@noble/hashes/legacy.js'
import bs58check from 'bs58check'

export async function generateTH3Address(
  mnemonic: string
): Promise<string> {
  const seed = await bip39.mnemonicToSeed(mnemonic)

  const master = HDKey.fromMasterSeed(seed)

  const child = master.derive(
    "m/44'/175'/0'/0/0"
  )

  if (!child.publicKey) {
    throw new Error('No public key')
  }

  const pubKeyHash = ripemd160(
    sha256(child.publicKey)
  )

  const payload = new Uint8Array(
    1 + pubKeyHash.length
  )

  payload[0] = 60

  payload.set(pubKeyHash, 1)

  return bs58check.encode(payload)
}
