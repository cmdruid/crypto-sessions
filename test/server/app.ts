import express, { Express, Request, Response } from 'express'
import { ECC } from '@cmdcode/crypto-utils'
import { useWithExpress } from '../../src/middleware.js'

const serverKeys = new ECC.KeyPair(process.env.CRYPTO_SESSION_KEY ?? '')

export const peerKey = serverKeys.publicHex

export const app: Express = express()

app.use(express.urlencoded({ extended: false }))
app.use(express.json({ limit: 1000 }))
app.use(useWithExpress)

app.get('/getSend', async (req: Request, res: Response) => {
  console.log(req.url, req.query)
  const { challenge } = req.query
  return (req.isAuthenticated)
    ? res.status(200).secure.send(String(challenge))
    : res.status(401).end()
})

app.post('/postSend', async (req: Request, res: Response) => {
  console.log(req.url, req.body)
  const { challenge } = req.body
  return (req.isAuthenticated)
    ? res.secure.send(challenge)
    : res.status(401).end()
})

app.get('/getJson', async (req: Request, res: Response) => {
  console.log(req.url, req.query)
  return (req.isAuthenticated)
    ? res.status(200).secure.json(req.query)
    : res.status(401).end()
})

app.post('/postJson', async (req: Request, res: Response) => {
  console.log(req.url, req.body)
  return (req.isAuthenticated)
    ? res.secure.json(req.body)
    : res.status(401).end()
})
