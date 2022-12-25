import { Buff }   from '@cmdcode/buff-utils'
import { Token }  from './token.js'
import { Schema } from './schema.js'
import { Cipher, sha256, Signer } from '@cmdcode/crypto-utils'

export type Payload = string | object

export interface EncodedData {
  data  : string
  token : Token
}

export interface DecodedData {
  data    : Payload
  isValid : boolean
}

export class CryptoSession {

  private readonly secret: Uint8Array
  public peerKey : Uint8Array

  static withToken(
    b64token  : string,
    secretKey : string | Uint8Array
  ): CryptoSession {
    const { publicKey: peerKey } = Token.import(b64token)
    return new CryptoSession(peerKey, secretKey)
  }

  constructor(
    peerKey   : string | Uint8Array, 
    secretKey : string | Uint8Array
  ) {
    this.peerKey = Buff.normalizeBytes(peerKey)
    this.secret  = Buff.normalizeBytes(secretKey)
  }

  get peerHex(): string {
    return Buff.buff(this.peerKey).toHex()
  }

  get cipher(): Promise<Cipher> {
    return Cipher.fromShared(this.secret, this.peerKey)

  }

  get signer(): Signer {
    return Signer.from(this.secret)
  }

  get pubKey(): Uint8Array {
    return this.signer.publicKey
  }

  get pubHex(): string {
    return Buff.buff(this.pubKey).toHex()
  }

  get sharedSecret(): Promise<Uint8Array> {
    return this.cipher
      .then(async (cipher) => cipher.secretKey)
  }

  get sharedHash(): Promise<Uint8Array> {
    return this.sharedSecret
      .then(async (bytes) => sha256(bytes))
  }

  get sharedHex(): Promise<string> {
    return this.sharedHash
      .then(bytes => Buff.buff(bytes).toHex())
  }

  isWith(key : string) : boolean {
    return key === this.peerHex
  }

  async encrypt(data: Uint8Array): Promise<Uint8Array> {
    const cipher = await this.cipher
    return cipher.encrypt(data)
  }

  async decrypt(data: Uint8Array): Promise<Uint8Array> {
    const cipher = await this.cipher
    return cipher.decrypt(data)
  }

  async sign(
    payload: string | Uint8Array
  ) : Promise<Uint8Array> {
    const msg = Buff.normalizeData(payload)
    const digest = await sha256(msg)
    return this.signer.sign(digest)
  }

  async verify(
    token   : string | Token,
    payload : string | Uint8Array
  ) : Promise<boolean> {
    // If provided token is a string, convert to Token object.
    if (typeof token === 'string') token = Token.import(token)
    // Unpack the key and signature from token object.
    const { publicKey, signature } = token
    // Normalize the payload data and compute sha256 hash.
    const msg = Buff.normalizeData(payload)
    const digest = await sha256(msg)
    // Return if signature is valid, throw if configured.
    return Signer.verify(digest, publicKey, signature)
  }

  async encode(payload: Payload): Promise<EncodedData> {
    // Create a digest of the payload and sign it.
    const rawData   = Buff.normalizeData(payload)
    const signature = await this.sign(rawData)
    const encData   = await this.encrypt(rawData)
    // Return signature token with encrypted payload.
    return {
      token : new Token(this.pubKey, signature),
      data  : Buff.buff(encData).toB64url(),
    }
  }

  async decode(
    token   : string | Token, 
    payload : string
  ): Promise<DecodedData> {
    // Decode the token and payload into bytes.
    const encData = Schema.decoded.parse(payload)
    const rawData = await this.decrypt(encData)
    const isValid = await this.verify(token, rawData)
    return { isValid, data: reviveData(rawData) }
  }
}

function reviveData(data : Uint8Array) : Payload {
  const str = Buff.buff(data).toStr()
  try { return JSON.parse(str) } 
  catch { return str }
}
