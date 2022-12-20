import { Buff } from '@cmdcode/buff-utils'
import { z } from 'zod'

const stringErr = (name: string): object => {
  return {
    description: name,
    required_error: `${name} is required.`,
    invalid_type_error: `${name} must be a string.`,
  }
}

const secretSchema = z
  .string(stringErr('Secret key'))
  .regex(/^[a-fA-F0-9]{64}$/, 'Must be 32 bytes in hex string format.')

const pubSchema = z
  .string(stringErr('Public key'))
  .regex(/^(02|03)([a-fA-F0-9]{64})$/, 'Must be 33 bytes in hex string format.')

const sigSchema = z
  .string(stringErr('Signature'))
  .regex(/^[a-fA-F0-9]$/, 'Must be hex string in DER format.')

const tokenSchema = z
  .string(stringErr('Token'))
  .regex(/^[a-zA-Z0-9_-]+$/, 'Must be in base64url format.')

const encodedSchema = z
  .string(stringErr('Encoded data'))
  .regex(/^[a-zA-Z0-9_-]+$/, 'Must be in base64url format.')
  .transform((s) => Buff.b64url(s))

const headerSchema = z.object({ authorization: tokenSchema })

const jsonSchema = z
  .object({})
  .catchall(z.any())
  .transform((obj) => JSON.stringify(obj))

const bodySchema = z.union([z.string(), jsonSchema])

export const schema = {
  secret: secretSchema,
  pubKey: pubSchema,
  signature: sigSchema,
  token: tokenSchema,
  encoded: encodedSchema,
  headers: headerSchema,
  body: bodySchema,
}
