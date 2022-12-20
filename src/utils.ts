import { Buff } from '@cmdcode/buff-utils'
import { schema } from './schema.js'

export function b64decode(data: string): Uint8Array {
  return schema.encoded.parse(data)
}

export function returnBytes(data: string | Uint8Array): Uint8Array {
  return typeof data === 'string' ? Buff.hex(data).toBytes() : data
}

export function logRaw(data: any): void {
  for (const key of Object.keys(data)) {
    console.log(`${key}: ${Buff.buff(data[key]).toHex()}`)
  }
}
