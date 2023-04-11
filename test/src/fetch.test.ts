import tape from 'tape'
import { Buff }      from '@cmdcode/buff-utils'
import { SecretKey } from '@cmdcode/crypto-utils'
import { SecureFetch, SecureResponse } from '../../src/fetch.js'
import { app, peerKey } from '../server/app.js'

export default function fetchTest(): void {
  tape('Testing fetch and middleware.', async (t) => {

    t.plan(6)

    const seckey = new SecretKey('6fa608cc1bf85529400327bd27f303b7cfb0edab47b90e1cae51117a2ebb4b0a')

    const simpleFetch = new SecureFetch(peerKey, seckey)

    const customFetch = new SecureFetch(peerKey, Buff.random(32), {
      hostname: 'http://localhost:3001',
    })

    const server    = app.listen(3001)
    const challenge = Buff.random(16).hex

    const simpleGetResponse = await simpleFetch(`http://localhost:3001/getSend?challenge=${challenge}`)

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

    const nullResponse = await customFetch('/postJson', { method: 'POST' })

    checkResponse(nullResponse)
    t.equal(nullResponse.ok, true, 'Nullish body should return a valid response.')
    t.equal(nullResponse.data, nullResponse.url, 'Nullish response should be request url.')

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
