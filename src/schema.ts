import { Buff } from '@cmdcode/buff-utils'
import { z }    from 'zod'

const stringErr = (name : string) : object => {
  return {
    description        : name,
    required_error     : `${name} is required.`,
    invalid_type_error : `${name} must be a string.`
  }
}

const secretSchema = z
  .string(stringErr('Secret key'))
  .regex(/^[a-fA-F0-9]{64}$/, 'Must be 32 bytes in hex string format.')

// const pubSchema = z
//   .string(stringErr('Public key'))
//   .regex(/^(02|03)([a-fA-F0-9]{64})$/, 'Must be 33 bytes in hex string format.')

// const sigSchema = z
//   .string(stringErr('Signature'))
//   .regex(/^[a-fA-F0-9]{128}$/, 'Must be 64 bytes in hex string format.')

const encodedSchema = z
  .string(stringErr('Encoded data'))
  .regex(/^[a-zA-Z0-9_-]+$/, 'Must be in base64url format.')

const decodedSchema = encodedSchema
  .transform((s : string) => Buff.b64url(s).toBytes())

// const headerSchema = z.object({}).catchall(z.string())

// const authSchema = z.object({
//   authorization: encodedSchema
// }).merge(headerSchema)

const tokenSchema = decodedSchema
  .refine(bytes => bytes.length === 97)

const objSchema = z.object({}).catchall(z.any())

const bodySchema = z.union([
  z.string(),
  objSchema.transform((obj) => JSON.stringify(obj))
]).nullish()

export const Schema = {
  secret  : secretSchema,
  decoded : decodedSchema,
  token   : tokenSchema,
  object  : objSchema,
  body    : bodySchema
}
