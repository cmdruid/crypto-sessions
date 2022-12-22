import { Buff } from '@cmdcode/buff-utils'

export class SignatureError extends Error {
  public digest    : string
  public publicKey : string
  public signature : string
  public message   : string

  constructor(
    digest    : Uint8Array,
    publicKey : Uint8Array,
    signature : Uint8Array,
    message?  : Uint8Array,
  ) {
    super('Signature failed to validate!')
    this.name = 'SignatureError'
    this.digest    = Buff.buff(digest).toStr()
    this.publicKey = Buff.buff(publicKey).toHex()
    this.signature = Buff.buff(signature).toHex()
    this.message   = String(message)
  }
}