import { Request, Response, NextFunction } from 'express'
import { CryptoSession }   from './session.js'
import { checkSessionKey } from './utils.js'
import { Token } from './token.js'

const HOST_NAME   = process.env.CRYPTO_SESSION_HOST ?? 'http://localhost:3001'
const PRIVATE_KEY = checkSessionKey(process.env.CRYPTO_SESSION_KEY)

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Request {
      token   : Token
      session : CryptoSession
      isAuthenticated : boolean
    }
    export interface Response {
      secure : SecuredSend
    }
  }
}

export interface SecuredSend {
  send : (payload : string) => Promise<Response>
  json : (payload : object) => Promise<Response>
}

export async function useWithExpress(
  req  : Request,
  res  : Response,
  next : NextFunction
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
): Promise<void | Response<any, Record<string, any>>> {
  try {
    // Apply middleware
    await useCryptoSession(req, res)
    // Use express next function.
    if (req.isAuthenticated) 
      return next()
    return res.status(401).end()
  } catch (err) {
    console.log('[server]:', err)
    return res.status(401).end()
  }
}

export function useWithNext(handler: Function): unknown {
  return async (req: Request, res: Response) => {
    try {
      // Apply middleware
      await useCryptoSession(req, res)
      // Return handler to next router.
      return handler(req, res)
    } catch (err) {
      console.log(err)
      return res.status(401).end()
    }
  }
}

export async function useCryptoSession(
  req: Request,
  res: Response
): Promise<void> {
  // Init auth state to false.
  req.isAuthenticated = false
  // Check for session token.
  await getSessionToken(req, res)
  // Validate request based on method.
  if (req.method === 'GET') {
    // If GET, validate the request url.
    const payload = HOST_NAME + req.originalUrl
    req.isAuthenticated = await verifyRequest(req, payload)
  } 
  if (req.method === 'POST') {
    // If POST, validate the request body.
    const { data: payload  } = req.body
    req.isAuthenticated = await decodeRequest(req, payload)
  }
}

async function getSessionToken(
  req : Request,
  res : Response
) : Promise<void> {
  // Unpack all required values.
  const { authorization } = req.headers
  if (await Token.check(authorization)) {
    // Initialzie token and session object.
    req.token   = Token.import(authorization)
    req.session = new CryptoSession(req.token.publicKey, PRIVATE_KEY)
    // Add secured response helpers to the response object.
    setSecuredResponse(req, res)
  } else {
    throw TypeError('Authorization header is undefined!')
  }
}

async function verifyRequest(
  req     : Request,
  payload : any
) : Promise<boolean> {
  return req.session.verify(req.token, payload)
}

async function decodeRequest(
  req     : Request,
  payload : any
) : Promise<boolean> {
  const { data, isValid } = await req.session.decode(req.token, payload)
  if (isValid) req.body = data
  return isValid
}

function setSecuredResponse(
  req : Request,
  res : Response
) : void {
  res.secure = {
    send: async (payload: string) => {
      const { token, data } = await req.session.encode(payload)
      res.setHeader('authorization', token.encoded)
      return res.send(data)
    },
    json: async (payload: object) => {
      const json = JSON.stringify(payload)
      const { token, data } = await req.session.encode(json)
      res.setHeader('authorization', token.encoded)
      return res.send(data)
    }
  }
}

export const MidwareUtils = {
  getSessionToken,
  verifyRequest,
  decodeRequest,
  setSecuredResponse
}
