import { Buff } from '@cmdcode/buff-utils'
import { KeyPair } from '@cmdcode/crypto-utils'

export function checkSessionKey (key : string | undefined) : string {
  if (key === undefined) {
    const { hex: sechex, pub } = KeyPair.random()
    throw TypeError(`
      Environmment variable CRYPTO_SESSION_KEY is undefined!
      Here is a random key-pair in case you need one:
      Private Key : ${String(sechex)}
      Public Key  : ${String(pub.hex)}
    `)
  }
  return key
}

export function logRaw (data : any) : void {
  for (const key of Object.keys(data)) {
    console.log(`${key}: ${Buff.raw(data[key]).hex}`)
  }
}
