import tape from 'tape'
import { Buff } from '@cmdcode/buff-utils'
import { SecureFetch, SecureResponse } from '../src/fetch.js'
import { app, peerKey } from './server/app.js'

export default function fetchTest(): void {
  tape('Testing fetch and middleware.', async (t) => {

    t.plan(4)

    const { fetch: simpleFetch } = SecureFetch.generate(peerKey)

    const customFetch = new SecureFetch(peerKey, Buff.random(32), {
      hostname: 'http://localhost:3001',
    })

    const server = app.listen(3001)
    const challenge  = Buff.random(16).toHex()

    const simpleGetResponse = await simpleFetch(
      `http://localhost:3001/getSend?challenge=${challenge}`
    )

    checkResponse(simpleGetResponse)
    t.equal(simpleGetResponse.data, challenge, '/getSend should pass.')

    const simplePostResponse = await simpleFetch(
      'http://localhost:3001/postSend',
      { method: 'POST', body: { challenge } }
    )

    checkResponse(simplePostResponse)
    t.equal(simplePostResponse.data, challenge, '/postSend should pass.')

    const customGetResponse = await customFetch(`/getJson?challenge=${challenge}`)

    checkResponse(customGetResponse)
    t.deepEqual(customGetResponse.data, { challenge }, '/getJson should pass.')

    const customPostResponse = await customFetch(
      '/postJson', 
      { method: 'POST', body: { challenge },
    })

    checkResponse(customPostResponse)
    t.deepEqual(customPostResponse.data, { challenge }, '/postJson should pass.')

    t.teardown(() => {
      server.close()
    })
  })
}

function checkResponse(res : SecureResponse) : void {
  if (!res.ok || res.err !== undefined) {
    console.log(res.status, res.statusText, res.err)
  }
}
