import { Buff } from '@cmdcode/buff-utils'
import { Cipher, Hash, Keys, Signer, Util } from '@cmdcode/crypto-utils'
import { b64decode, returnBytes } from './utils.js'

const ec = new TextEncoder()
const dc = new TextDecoder()

export interface PayloadData {
  token: string
  data: string
}

export class CryptoSession {
  private readonly secret: Uint8Array
  public peerKey: Uint8Array

  static generate(peerKey: string | Uint8Array): CryptoSession {
    return new CryptoSession(peerKey, Util.getRandBytes(32))
  }

  static withToken(
    token: string,
    secretKey: string | Uint8Array
  ): CryptoSession {
    const tokenBytes = b64decode(token)
    const peerKey = tokenBytes.slice(0, 33)
    return new CryptoSession(peerKey, secretKey)
  }

  constructor(peerKey: string | Uint8Array, secretKey: string | Uint8Array) {
    this.peerKey = returnBytes(peerKey)
    this.secret  = returnBytes(secretKey)
  }

  get cipher(): Cipher {
    return Cipher.from(this.secret)
  }

  get signer(): Signer {
    return Signer.from(this.secret)
  }

  get pubKey(): Uint8Array {
    return this.signer.publicKey
  }

  get sharedSecret(): Promise<Uint8Array> {
    return Keys.getSharedSecret(this.secret, this.peerKey)
  }

  get sharedHash(): Promise<Uint8Array> {
    return this.sharedSecret
      .then(async (bytes) => Hash.sha256(bytes))
  }

  async getSignature(token: string): Promise<Uint8Array> {
    const tokenBytes = b64decode(token)
    const encSig = tokenBytes.slice(33)
    return this.decrypt(encSig)
  }

  async encrypt(data: Uint8Array): Promise<Uint8Array> {
    return this.cipher.encryptShared(this.peerKey, data)
  }

  async decrypt(data: Uint8Array): Promise<Uint8Array> {
    return this.cipher.decryptShared(this.peerKey, data)
  }

  async encode(payload: string): Promise<PayloadData> {
    // Create a digest of the payload and sign it.
    const rawData = ec.encode(payload)
    const encData = await this.encrypt(rawData)
    const digest = await Hash.sha256(rawData)
    const rawSig = await this.signer.sign(digest)
    const encSig = await this.encrypt(rawSig)
    // Return full token with encrypted payload
    return {
      token: Buff.join([this.pubKey, encSig]).toB64url(),
      data: Buff.buff(encData).toB64url(),
    }
  }

  async decode(token: string, payload: string): Promise<string> {
    // Decode the token and payload into bytes.
    const encData = b64decode(payload)
    const rawData = await this.decrypt(encData)
    if (!(await this.verify(token, rawData))) {
      throw TypeError('Payload signature failed to validate!')
    }
    return dc.decode(rawData)
  }

  async verify(token: string, bytes: Uint8Array): Promise<boolean> {
    const rawSig = await this.getSignature(token)
    const digest = await Hash.sha256(bytes)
    return Signer.verify(digest, this.peerKey, rawSig)
  }
}
