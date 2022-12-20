import tape from 'tape'
import { Util } from '@cmdcode/crypto-utils'
import { SecureFetch } from '../src/fetch.js'
import { app, peerKey } from './server/app.js'

export default function fetchTest(): void {
  tape('Testing fetch and middleware.', async (t) => {
    const simpleFetch = SecureFetch.generate(peerKey)

    const customFetch = new SecureFetch(peerKey, Util.getRandBytes(32), {
      hostname: 'http://localhost:3001',
    })

    const server = app.listen(3001)
    const txtPayload = 'ping!'
    const objPayload = { content: 'ping!' }

    const simpleGetResponse = await simpleFetch(
      'http://localhost:3001/getSend?content=ping!'
    )

    const simplePostResponse = await simpleFetch(
      'http://localhost:3001/postSend',
      { method: 'POST', body: txtPayload }
    )

    const customGetResponse = await customFetch('/getJson?content=ping!')

    const customPostResponse = await customFetch('/postJson', {
      method: 'POST',
      body: objPayload,
    })

    t.teardown(() => {
      server.close()
    })

    t.plan(4)
    t.equal(simpleGetResponse.data, txtPayload)
    t.equal(simplePostResponse.data, txtPayload)
    t.deepEqual(customGetResponse.data, objPayload)
    t.deepEqual(customPostResponse.data, objPayload)
  })
}
