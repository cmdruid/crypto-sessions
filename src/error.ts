import { Buff } from '@cmdcode/buff-utils'

export class SignatureError extends Error {
  public digest    : string
  public publicKey : string
  public signature : string
  public message   : string

  constructor (
    digest    : Uint8Array,
    publicKey : Uint8Array,
    signature : Uint8Array,
    message  ?: Uint8Array
  ) {
    super('Signature failed to validate!')
    this.name = 'SignatureError'
    this.digest    = Buff.raw(digest).str
    this.publicKey = Buff.raw(publicKey).hex
    this.signature = Buff.raw(signature).hex
    this.message   = String(message)
  }
}
