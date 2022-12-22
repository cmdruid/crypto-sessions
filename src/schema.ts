import { Buff } from '@cmdcode/buff-utils'
import { z } from 'zod'

const stringErr = (name: string): object => {
  return {
    description: name,
    required_error: `${name} is required.`,
    invalid_type_error: `${name} must be a string.`,
  }
}

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

type Literal = z.infer<typeof literalSchema>
type Json    = Literal | { [key: string]: Json } | Json[]

const secretSchema = z
  .string(stringErr('Secret key'))
  .regex(/^[a-fA-F0-9]{64}$/, 'Must be 32 bytes in hex string format.')

const pubSchema = z
  .string(stringErr('Public key'))
  .regex(/^(02|03)([a-fA-F0-9]{64})$/, 'Must be 33 bytes in hex string format.')

const sigSchema = z
  .string(stringErr('Signature'))
  .regex(/^[a-fA-F0-9]$/, 'Must be hex string in DER format.')

const encodedSchema = z
  .string(stringErr('Encoded data'))
  .regex(/^[a-zA-Z0-9_-]+$/, 'Must be in base64url format.')

const decodedSchema = encodedSchema
  .transform((s : string) => Buff.b64url(s).toBytes())

const headerSchema = z.object({ authorization: decodedSchema })

const objSchema = z.object({}).catchall(z.any())
  
const bodySchema = z.union([
  z.string(), 
  objSchema.transform((obj) => JSON.stringify(obj))
])

const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
)

export const schema = {
  secret    : secretSchema,
  pubKey    : pubSchema,
  signature : sigSchema,
  decoded   : decodedSchema,
  encoded   : encodedSchema,
  headers   : headerSchema,
  body      : bodySchema,
  json      : jsonSchema,
}
