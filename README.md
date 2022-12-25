# Crypto Sessions

Secure end-to-end client sessions & API calls. No cookies, storage, or state management required. Just modern key cryptography!

## Description

The goal of this project is to demo the use of private/public key pairs for user authentication, rather than session cookies or passwords.

The advantage of this approach is that you do not have to mess with managing session cookies, tokens or passwords, which can burden a new project. All users are authenticated in real-time via cryptograhy.

The disadvantage of this approach is that key management is now pushed into the hands of the user / client, which is a much different paradigm. Browsers handle this responsibility poorly (XSS attacks anyone?), and the loss / leaking of passwords is still an issue.

A side-benefit of this approach is that all requests/responses are cryptgraphically signed end-to-end, and data payloads are encrypted end-to-end as well.

The session middleware is also simplified to just checking the signature on each request. This is contrast to auth providers that involve handling tokens and intermediary requests (which can be hijacked).

## This is dumb. Why change things?

It is a fun experiment! Plus, using public keys for identity works well with cryptocurrency and other emerging protocols (like nostr? ;-)).

There's also a severe lack of tooling when it comes to client-side key management. DIDs show some promise, but so far there is nothing material.

But I like to experiement, and state-less user sessions sounds like it would be fun for small projects. Maybe it will help push further development and tooling for self-custody of keys. Let me know what you think!

## How to Use

This library is designed to work in both Nodejs and browser environments. This library should also work within Cloudflare workers (but I have not tried it yet).

Packages are available on NPM as **@cmdcode/crypto-sessions** with CDN support:
```html
<script src="https://unpkg.com/@cmdcode/crypto-sessions"></script>
```

The library contains three main components: 

  1. A fetch client (for sending requests to a server)
  2. Session handler (can be used client <-> server or standalone p2p)
  3. Server middleware (for receiving requests from a client).

### Fetch Client

For traditional client requests, this library provides a `SecureFetch` method that works as a drop-in replacement for the `fetch()` method API.

```ts
import { SecureFetch } from '@cmdcode/crypto-sessions'

/* Returns a secure fetch method for making requests. */

const fetch = new SecureFetch(
  // Used for encrypting traffic end-to-end.
  serverPubkey    : string | Uint8Array,
  // Used for signing each request.
  clientSecretKey : string | Uint8Array,
  // Extends the default Request object.
  options? : SecureFetchOptions
)

/* Options for initializing SecureFetch. */

interface SecureFetchOptions {
  hostname? : string,    // Provides a default hostname to prepend to requests.
  fetcher?  : Function,  // Use to set a custom fetcher method. Defaults to fetch.
  verbose?  : boolean,   // Dumps a copy of all outgoing requests to console. useful for debugging!
  ...Request             // All Request options will work here, and act as defaults for each request.
}
```
The new method should act as a drop-in replacement for fetch, and can be configured using the typical `Request` API. 

```ts
const res : SecureResponse = await fetch(
  'http://localhost:3000/api/endpoint',
  { 
    headers : { 'key' : 'value' },
    method  : 'GET' | 'POST',
    body    : { content: 'hello world!' }
  }
)
```
The returned `Response` object will also be similar, but include a few extra fields.

```ts
// The response will look slightly different.
interface SecureResponse {
  ...Response  // Typical Response object.
  data? : any  // Decrypted data returned from the server, if any.
  err?  : any  // Authentication errors returned from the client, if any.
}
```

### Session Handler

Underneath the hood, the `SecureFetch` client is using your keys to create a new `CryptoSession` object. This object is used to sign and encrypt requests to the server, plus decrypt and verify the server response.

t

```ts
// Example import of the CryptoSession object.
import { CryptoSession } from '@cmdcode/crypto-sessions'

/* Create a client <-> peer CryptoSession instance.
 * Your peer must also configure a matching instance.
 */
const session = new CryptoSession(
  // Used for encrypting traffic end-to-end.
  peerPublickey : string | Uint8Array,
  // Used for signing each request.
  yourSecretKey : string | Uint8Array
)

// Encode a data payload to send outbound.
const { 
  token   : string, // Base64urlEncode(clientPubKey + signature)
  payload : string  // Base64urlEncode(encrypted(payload))
} = await session.encode(data : string | object)

// Decode and verify an incoming payload.
const { data, isValid } = await session.decode(token, payload)
```

When sending a request, `yourSecretKey` is used to perform the following:
  * For `GET` : Hash + sign the full URL of the request (including query string).
  * For `POST`: Hash + sign the contents of req.body.
  * For `POST`: Encrypt the contents of req.body using the peerPublicKey.
  * Provide a token (pubkey + signature) for decryption and verification.

The `peerPublicKey` is used to encrypt the outgoing payload, plus decrypt and verify the returned response.

You can use the `encode` and `decode` methods on the `CryptoSession` object to establish end-to-end signed and encrypted connection with another peer (ex. via websockets or nostr :-)), or your can use it to authenticate with a traditional HTTP server via a middleware function.

Full API of the `CryptoSession` object:

### Server Middleware

For convenience, this package includes a generic middleware function, plus a wrapper for **Express** `(req, res, next)` and **NextJs** `(req, res)` style servers.

```ts
import { useCryptoAuth } from '@cmdcode/crypto-sessions'

/* We have to set some environment variables first. */

// The hostname of your server. The client
// will include your hostname when they sign.
process.env.CRYPTO_SESSION_HOST

// The secret key to use for establishing sessions.
process.env.CRYPTO_SESSION_KEY

/* Example of a generic middleware function. */

export async function useMiddleWare(
  req: Request, res: Response, next: NextFunction
) {
  try {
    // Apply middleware
    await useCryptoAuth(req, res)
    // Return next function.
    return next()
  } catch (err) {
    // Catch any errors, return failed response.
    console.log(err)
    return res.status(401).end()
  }
}
```

The `useCryptoAuth` middleware will check `req.headers.authorization` for any tokens, then use it to create a `CryptoSession` that decrypts and verifies the request.

Once verified, the `CryptoSession` instance is stored in `req.session`, with linked response methods stored in `res.secure`.

```ts
// Example express API endpoint.
app.get('http://localhost:3001/api/hello?name=world!', async (
  req : Request, 
  res : Response
) : => {

  // A helper boolean is provided for checking authentication status.
  req.isAuthorized = true | false

  // You have access to the client/server CryptoSession object.
  const {
    peerKey       // The public key of the client.
    peerHex       // Hex-encoded string of the peerKey.
    pubKey        // The public key of your server.
    sharedSecret  // The shared secret between the client <-> server.
    sharedHash    // The sha256 hash of the shared secret.
  } = req.session

  // You also have access to all CryptoSession methods.
  req.session
    .encode()   // Same encoding method as above.
    .decode()   // Same decoding method as above.
    .sign()     // Provides a signature for the provided payload.
    .verify()   // Verifies a payload signature and key.
    .encrypt()  // Encrypt an outgoing payload using current CryptoSession.
    .decrypt()  // Decrypt an incoming payload using current CryptoSession.

  // In addition, you have access to secure response methods.
  // Use these methods to send a secured response to the client.
  res.secure
    .send(data: string, status: number) => Promise<Response>
    .json(data: object, status: number) => Promise<Response>
})
```

Example of using `useAuthWithExpress` middleware method with Express.

```ts
// Example import of the middleware.
import { useAuthWithExpress } from '@cmdcode/crypto-sessions'

// Example configuration of the express server.
const app = express()

app.use(express.urlencoded())
app.use(express.json())
app.use(useAuthWithExpress)

app.listen(3000)
```

Example of using `useAuthWithNext` middleware method with NextJs.

```ts
// Example import of the middleware.
import { useAuthWithNext } from '@cmdcode/crypto-sessions'

// Example Next API method.
async function helloAPI(
  req : NextApiRequest, 
  res : NextApiResponse
) {
  const { name } = req.query
  return res.secure.json({ message: `Hello ${name}!` })
}

// The middleware is used to wrap the method export.
export default useAuthWithNext(helloAPI)
```

## Cryptography

This library uses the Secp256k1 curve for cryptography, ECDH for shared secret derivation, AES-CBC for encryption, and Schnorr for signatures.

## Improvements / TODO

* Write better tests for the edge cases.
* Clean up the zod schemas and add better error messages.
* Overall more verbose error checking for failed authentication.
* Add support for key tweaking and tweak verification.

## Questions / Issues
Feel free to ask questions and submit issues. All are welcome!

## Contributing
Looking for contributors. Feel free to contribute!

## Resources

This project aims to be very light-weight. ith minimal dependencies.

**@noble/secp256k1**  
Implementation of secp256k1 in Javascript.  
https://github.com/paulmillr/noble-secp256k1

**zod**  
Run-time schema validation with static type inference.  
https://github.com/colinhacks/zod

**Crypto-Utils**  
Utility library that wraps WebCrypto and @noble/secp.  
https://github.com/cmdruid/crypto-utils

**Buff-Utils**  
Utility library for working with byte arrays.  
https://github.com/cmdruid/bytes-utils
