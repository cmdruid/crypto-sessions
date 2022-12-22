import { Buff } from '@cmdcode/buff-utils'
import { Keys } from '@cmdcode/crypto-utils'

export function checkSessionKey(key : string | undefined) : string {
  if (key === undefined) {
    const { privateHex, publicHex } = Keys.genKeyPair()
    throw TypeError(`
      Environmment variable CRYPTO_SESSION_KEY is undefined!
      Here is a random key-pair in case you need one:
      Private Key : ${String(privateHex)}
      Public Key  : ${String(publicHex)}
    `)
  }
  return key
}

export function logRaw(data: any) : void {
  for (const key of Object.keys(data)) {
    console.log(`${key}: ${Buff.buff(data[key]).toHex()}`)
  }
}
