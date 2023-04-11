import { Buff, Bytes, Json } from '@cmdcode/buff-utils'

import {
  Cipher,
  SecretKey,
  PublicKey,
  verify
} from '@cmdcode/crypto-utils'

import { Token }  from './token.js'
import { Schema } from './schema.js'

export type Payload = string | Json

export interface EncodedData {
  data  : string
  token : Token
}

export interface DecodedData {
  data    : Payload
  isValid : boolean
}

export class CryptoSession {
  readonly _secret : Buff
  readonly peerKey : Buff

  static withToken (
    b64token  : string,
    secretKey : Bytes
  ) : CryptoSession {
    const { pubkey: peerKey } = Token.import(b64token)
    return new CryptoSession(peerKey, secretKey)
  }

  constructor (
    peerKey   : Bytes,
    secretKey : Bytes
  ) {
    this.peerKey = Buff.bytes(peerKey)
    this._secret = Buff.bytes(secretKey)
  }

  get cipher () : Promise<Cipher> {
    return Cipher.fromShared(this._secret, this.peerKey)
  }

  get seckey () : SecretKey {
    return new SecretKey(this._secret)
  }

  get pubkey () : PublicKey {
    return this.seckey.pub
  }

  get shared () : Promise<Buff> {
    return this.cipher
      .then(async (cipher) => cipher.secretKey)
      .then(bytes => Buff.raw(bytes))
  }

  isWith (key : string) : boolean {
    return key === this.peerKey.hex
  }

  async encrypt (data : Uint8Array) : Promise<Uint8Array> {
    const cipher = await this.cipher
    return cipher.encrypt(data)
  }

  async decrypt (data : Uint8Array) : Promise<Uint8Array> {
    const cipher = await this.cipher
    return cipher.decrypt(data)
  }

  sign (
    payload : Bytes
  ) : Uint8Array {
    const digest = Buff.serialize(payload).digest
    return this.seckey.sign(digest, 'ecdsa')
  }

  verify (
    token   : string | Token,
    payload : Bytes
  ) : boolean {
    // If provided token is a string, convert to Token object.
    if (typeof token === 'string') token = Token.import(token)
    // Unpack the key and signature from token object.
    const { pubkey, signature } = token
    // Normalize the payload data and compute sha256 hash.
    const digest = Buff.serialize(payload).digest
    // Return if signature is valid, throw if configured.
    if (pubkey.hex !== this.peerKey.hex) {
      return false
    }
    return verify(signature, digest, pubkey, 'ecdsa')
  }

  async encode (payload : Payload) : Promise<EncodedData> {
    // Create a digest of the payload and sign it.
    const rawData   = Buff.serialize(payload)
    const signature = this.sign(rawData)
    const encData   = await this.encrypt(rawData)
    // Return signature token with encrypted payload.
    return {
      token : new Token(this.pubkey, signature),
      data  : Buff.raw(encData).b64url
    }
  }

  async decode (
    token   : string | Token,
    payload : string
  ) : Promise<DecodedData> {
    // Decode the token and payload into bytes.
    const encData = Schema.decoded.parse(payload)
    const rawData = await this.decrypt(encData)
    const isValid = this.verify(token, rawData)
    return { isValid, data: reviveData(rawData) }
  }
}

function reviveData (data : Uint8Array) : Payload {
  const str = Buff.raw(data).str
  try { return JSON.parse(str) } catch { return str }
}
