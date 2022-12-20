import { schema } from './schema.js'
import { CryptoSession } from './session.js'
import { Request, Response, NextFunction } from 'express'

const ec = new TextEncoder()

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session: CryptoSession
    }
    interface Response {
      secureSend: (payload: string, status?: number) => Promise<Response>
      secureJson: (payload: object, status?: number) => Promise<Response>
    }
  }
}

export interface SecureNextRequest {
  query: Partial<Record<string, string | string[]>>
  cookies: Partial<Record<string, string>>
  body: any
  headers: Headers
  method: string
  url: string
}

export interface SecureNextResponse {
  secureSend: (payload: string, status?: number) => void
}

export async function useAuthwithExpress(
  req: Request,
  res: Response,
  next: NextFunction
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
): Promise<void | Response<any, Record<string, any>>> {
  try {
    // Apply middleware
    await useCryptoAuth(req, res)
    // Use express next function.
    return next()
  } catch (err) {
    console.log(err)
    return res.status(400).send({ err })
  }
}

export function useAuthwithNext(handler: Function): unknown {
  return async (req: Request, res: Response) => {
    try {
      // Apply middleware
      await useCryptoAuth(req, res)
      // Return handler to next router.
      return handler(req, res)
    } catch (err) {
      console.log(err)
      return res.json({ err })
    }
  }
}

export async function useCryptoAuth(
  req: Request,
  res: Response
): Promise<void> {
  // Define environment variables.
  const HOST_NAME = process.env.CRYPTO_SESSION_HOST ?? 'http://localhost:3001'
  const PRIVATE_KEY = schema.secret.parse(process.env.CRYPTO_SESSION_KEY)
  // Unpack the request object.
  const { body, headers, method, url } = req
  // Extract the token from the request headers.
  if (headers.authorization !== undefined) {
    const { authorization: token } = schema.headers.parse(headers)
    // Establish a session using the token and server's private key.
    const session = CryptoSession.withToken(token, PRIVATE_KEY)
    // Handle the request based on GET or POST method.
    if (method === 'GET') {
      const isValid = await session.verify(token, ec.encode(HOST_NAME + url))
      if (!isValid) throw TypeError('Invalid signature!')
    }
    if (method === 'POST') {
      // Check if body is encoded.
      const { isEncoded, data, type } = body
      if (isEncoded === true) {
        const decoded = await session.decode(token, data)
        req.body = type === 'object' ? JSON.parse(decoded) : decoded
      }
    }
    // Save our session object to the request object.
    req.session = session
    // Add a secure session helper to the response object.
    res.secureSend = async (payload: string, status?: number) => {
      const { token, data } = await session.encode(payload)
      res.setHeader('content-type', 'text/plain')
      res.setHeader('authorization', token)
      return res.status(status ?? 200).send(data)
    }
    res.secureJson = async (payload: object, status?: number) => {
      const { token, data } = await session.encode(JSON.stringify(payload))
      res.setHeader('content-type', 'application/json')
      res.setHeader('authorization', token)
      return res.status(status ?? 200).send(data)
    }
  }
}
