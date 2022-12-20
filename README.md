# Crypto Sessions

Secure end-to-end client sessions & API calls. No cookies, storage, or state management required. Just modern key cryptography!

## How to Use

This library contains three main components: 

  1. A fetch client.
  2. Session handler.
  3. Server middleware.

### Fetch Client

For traditional fetch requests, this library provides a `SecureFetch` function that wraps the traditional `fetch()` method API.

```ts
import { SecureFetch } from '@cmdcode/crypto-sessions'

/* Returns a secure fetch method for making API calls. */

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
  ...Request             // All Request options work here, and act as defaults.
}

/* The new fetch method should act as a drop-in replacement for existing fetch. */

const res : SecureResponse = await fetch(
  'http://localhost:3000/api/endpoint',
  { 
    method : 'GET' | 'POST',
    body   : JSON.stringify({ hello: 'world!' })
  }
)
```

On the surface, the new fetch method should work as expected. When receiving a response, the `Response` object will look familiar, though slightly different.

```ts
// The response will look slightly different.
interface SecureResponse {
  data? : any     // Data returned from the server, if any.
  err?  : object  // Error returned from the client, if any.
  ...Response     // Rest of Response object.
}
```

### Session Handler

Underneath the hood, the `SecureFetch` client is using your keys to create a new `CryptoSession` object. This object is used to sign and encrypt each request to the server, plus decrypt and verify the server response.

```ts
// Example import of the CryptoSession object.
import { CryptoSession } from '@cmdcode/crypto-sessions'

// Create a client <-> peer CryptoSession instance.
// Your peer will need to create a matching instance.
const session = new CryptoSession(
  // Used for encrypting traffic end-to-end.
  peerPublickey : string | Uint8Array,
  // Used for signing each request.
  yourSecretKey : string | Uint8Array
)

// Encoding a data payload to send outbound.
const { 
  token : string, // Base64urlEncode(clientPubKey + encrypted(signature))
  data  : string  // Base64urlEncode(encrypted(payload))
} = await session.encode(payload : string)

// Decoding and verify an incoming payload.
const payload = await session.decode(token, data)
```

When sending a request, `yourSecretKey` is used to perform the following:
  1. Sign the full URL of the request (including query strings).
  2. Sign a sha256 hash digest of res.body value (POST).
  3. Provide a compressed public key for verification and encryption.

The `peerPublicKey` is used to encrypt the outgoing payload 
and signature, plus decrypt and verify the incoming response.

You can use the `encode` and `decode` methods on the `CryptoSession` object to establish an end-to-end encrypted and signed connection directly with another peer (ex. over websockets or nostr :-)), or your can use it to authenticate with a traditional HTTP server using a middleware function.

### Server Middleware

For convenience, this package includes a generic middleware function, plus a wrapper for Express (req, res, next) and NextJs (req, res) style servers.

```ts
import { useCryptoAuth } from '@cmdcode/crypto-sessions'

/* We have to set some environment variables first. */

// The host name is signed by the client, so this must be correct.
const HOST_NAME   = process.env.CRYPTO_SESSION_HOST
// The private key is used to sign responses, plus decrypt traffic.
const SESSION_KEY = process.env.CRYPTO_SESSION_KEY

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

The `useCryptoAuth` middleware will check `req.headers.authorization` for any tokens, and use it to decrypt and verify the request. Once verified, the middleware will store the client's `CryptoSession` instance in `req.session`, plus helper methods in `res.secureSend` and `res.secureJson`.

```ts
// Example express API endpoint.
app.get('http://localhost:3001/api/hello?name=world!', async (
  req : Request, 
  res : Response
) : => {
  // You have access to the client/server CryptoSession object.
  const {
    peerKey       // The public key of the client.
    pubKey        // The public key of your server.
    sharedSecret  // The shared secret between the client <-> server.
    sharedHash    // The sha256 hash of the shared secret.
  } = req.session

  // You also have access to all CryptoSession methods.
  req.session
    .encode()   // Same encoding method as above.
    .decode()   // Same decoding method as above.
    .encrypt()  // Encrypt an outgoing payload using current CryptoSession.
    .decrypt()  // Decrypt an incoming payload using current CryptoSession.
    .cipher => Cipher  // Helper method used for encryption. 
    .signer => Signer  // Helper method used for ECDSA/Schnorr signatures.

  // In addition, you have access to two response helpers.
  res
    .secureSend(data: string, status: number) => Promise<Response>
    .secureJson(data: object, status: number) => Promise<Response>
})
```

Example of using `useAuthWithExpress` helper method with Express.

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

// Example of wrapping the Next API method.
async function helloAPI(
  req : NextApiRequest, 
  res : NextApiResponse
) {
  const { name } = req.query
  return res.secureJson({ message: `Hello ${name}!` })
}

// The middleware is used to wrap the method export.
export default useAuthWithNext(helloAPI)
```

## Questions / Issues
Feel free to ask questions and submit issues. All are welcome!

## Contributing
Looking for contributors. Feel free to contribute!

## Resources
Coming soon!
