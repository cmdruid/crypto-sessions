import { Buff }   from '@cmdcode/buff-utils'
import { Schema } from './schema.js'

export type TokenString = string | null | undefined

export interface TokenData {
  pubkey    : Uint8Array
  signature : Uint8Array
}

export class Token {
  public pubkey    : Buff
  public signature : Buff

  static async check (encoded : TokenString) : Promise<boolean> {
    const res = await Schema.token.spa(encoded)
    return res.success
  }

  static parse (encoded : TokenString) : TokenData {
    const decoded = Schema.decoded.parse(encoded)
    return {
      pubkey    : decoded.slice(0, 33),
      signature : decoded.slice(33)
    }
  }

  static import (encoded : TokenString) : Token {
    const { pubkey, signature } = Token.parse(encoded)
    return new Token(pubkey, signature)
  }

  constructor (
    publicKey : string | Uint8Array,
    signature : string | Uint8Array
  ) {
    this.pubkey    = Buff.bytes(publicKey)
    this.signature = Buff.bytes(signature)
  }

  get encoded () : string {
    const bytes = [ this.pubkey, this.signature ]
    return Buff.join(bytes).toB64url()
  }

  issuedBy (key : string) : boolean {
    return (key === this.pubkey.hex)
  }
}
