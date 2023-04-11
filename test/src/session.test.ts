import tape from 'tape'
import { SecretKey }     from '@cmdcode/crypto-utils'
import { CryptoSession } from '../../src/session.js'

export default function sessionTest(): void {
  tape('Test suite for CryptoFetch Lib', async (t) => {
    // Generate keypairs for client and server.
    const clientKeys = SecretKey.random()
    const serverKeys = SecretKey.random()
    // Create a shared session for client and server.
    const clientSession = new CryptoSession(
      serverKeys.pub.raw,
      clientKeys.raw
    )
    const serverSession = new CryptoSession(
      clientKeys.pub.raw,
      serverKeys.raw
    )
    // Wrap a test payload for the client to send.
    const clientPayload = { client: 'ping!' }

    const { 
      token : clientToken, 
      data  : clientData 
    } = await clientSession.encode(clientPayload)

    // Unwrap the test message using the server's session.
    const { data, isValid } = await serverSession.decode(clientToken, clientData)

    t.plan(2)
    t.equal(isValid, true)
    t.deepEqual(data, clientPayload)
  })
}
