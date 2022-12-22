import { Buff } from '@cmdcode/buff-utils'
import { Keys } from '@cmdcode/crypto-utils'

export function reviveData(data : string) : object | string {
  try   { return JSON.parse(data) } 
  catch { return data }
}

export function b64check(data : string) : boolean {
  return data.search(/^[a-zA-Z0-9_-]+$/) === 0
}

export function b64decode(data : string) : Uint8Array {
  if (!b64check(data)) throw TypeError(`Invalid base64url string:\n${data}`)
  return Buff.b64url(data).toBytes()
}

export function isHeaderMap(headers : any) : boolean {
  // If headers does not equal object, throw error.
  if (typeof headers !== 'object') {
    throw TypeError(`Invalid header object: ${typeof headers}`)
  }
  // Check if headers object is client or serevr type.
  return (typeof headers?.get === 'function')
}

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
