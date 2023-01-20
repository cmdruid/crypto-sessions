import { Buff }   from '@cmdcode/buff-utils'
import { Schema } from './schema.js'

export type TokenString = string | null | undefined

export interface TokenData {
  publicKey : Uint8Array
  signature : Uint8Array
}

export class Token {
  public publicKey : Uint8Array
  public signature : Uint8Array

  static async check (encoded : TokenString) : Promise<boolean> {
    return (await Schema.token.spa(encoded)).success
  }

  static parse (encoded : TokenString) : TokenData {
    const decoded = Schema.decoded.parse(encoded)
    return {
      publicKey : decoded.slice(0, 33),
      signature : decoded.slice(33)
    }
  }

  static import (encoded : TokenString) : Token {
    const { publicKey, signature } = Token.parse(encoded)
    return new Token(publicKey, signature)
  }

  constructor (
    publicKey : string | Uint8Array,
    signature : string | Uint8Array
  ) {
    this.publicKey = Buff.normalize(publicKey)
    this.signature = Buff.normalize(signature)
  }

  get pubHex () : string {
    return Buff.buff(this.publicKey).toHex()
  }

  get sigHex () : string {
    return Buff.buff(this.signature).toHex()
  }

  get encoded () : string {
    const bytes = [ this.publicKey, this.signature ]
    return Buff.join(bytes).toB64url()
  }

  issuedBy (key : string) : boolean {
    return (key === this.pubHex)
  }
}
