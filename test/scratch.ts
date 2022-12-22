import { SecureFetch } from '../src/fetch.js'

const serverPub = '02440d52c8fb73d2bc850d972967f220d8a93e253cad4259fcf3c537ece24ec153'

const { fetch, session } = SecureFetch.generate(serverPub)

console.log(session)