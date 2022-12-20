import tape from 'tape'
import { Keys } from '@cmdcode/crypto-utils'
import { CryptoSession } from '../src/session.js'

export default function sessionTest(): void {
  tape('Test suite for CryptoFetch Lib', async (t) => {
    // Generate keypairs for client and server.
    const clientKeys = Keys.generateKeyPair()
    const serverKeys = Keys.generateKeyPair()
    // Create a shared session for client and server.
    const clientSession = new CryptoSession(
      serverKeys.publicKey,
      clientKeys.privateKey
    )
    const serverSession = new CryptoSession(
      clientKeys.publicKey,
      serverKeys.privateKey
    )
    // Wrap a test payload for the client to send.
    const clientPayload = JSON.stringify({ client: 'ping!' })
    const { token: clientToken, data: clientData } = await clientSession.encode(
      clientPayload
    )
    // Unwrap the test message using the server's session.
    const clientResponse = await serverSession.decode(clientToken, clientData)

    t.plan(1)
    t.equal(clientResponse, clientPayload)
  })
}
