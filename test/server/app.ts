import express, { Express, Request, Response } from 'express'
import { Buff } from '@cmdcode/buff-utils'
import { Keys } from '@cmdcode/crypto-utils'
import { useAuthWithExpress } from '../../src/middleware.js'

const serverKeys = Keys.genKeyPair()

export const peerKey = serverKeys.publicHex

process.env.CRYPTO_SESSION_KEY = Buff.buff(serverKeys.privateKey).toHex()

export const app: Express = express()

app.use(express.urlencoded({ extended: false }))
app.use(express.json({ limit: 1000 }))
app.use(useAuthWithExpress)

app.get('/getSend', async (req: Request, res: Response) => {
  console.log(req.url, req.query)
  const { content = 'failed' } = req.query
  return res.secureSend(String(content))
})

app.post('/postSend', async (req: Request, res: Response) => {
  console.log(req.url, req.body)
  return res.secureSend(req.body)
})

app.get('/getJson', async (req: Request, res: Response) => {
  console.log(req.url, req.query)
  return res.secureJson(req.query)
})

app.post('/postJson', async (req: Request, res: Response) => {
  console.log(req.url, req.body)
  return res.secureJson(req.body)
})
