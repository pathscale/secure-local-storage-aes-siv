# @pathscale/secure-local-storage-aes-siv

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An encrypted `localStorage` wrapper using **AES-SIV** (RFC 5297) authenticated
encryption with a **64-byte key**. Hard-fork of the ChaCha20-Poly1305 secure
storage package with the encryption layer swapped to AES-SIV.

## Why AES-SIV

- **Nonce-misuse-resistant.** The synthetic IV is derived from the plaintext +
  associated data, so the **frontend never generates, stores, or manages a
  nonce**. There is no nonce field in the storage envelope.
- **Deterministic.** The same key + plaintext + associated data produce the same
  ciphertext.
- **Authenticated.** Wrong key, tampered ciphertext, or a swapped
  algorithm/version all fail to decrypt.

Backed by [`@noble/ciphers`](https://github.com/paulmillr/noble-ciphers)
(`aessiv`).

## Key contract

- The key must be **exactly 64 raw bytes** (AES-256-SIV / 512 bits).
- Supply it as a **base64 string** (as returned by Honey auth) or a raw
  `Uint8Array(64)`.
- The key **must be kept in memory only**. Never write it to `localStorage`,
  `sessionStorage`, cookies, or any persisted store.
- Anything that is not exactly 64 bytes throws `InvalidEncryptionKeyError`.

> ⚠️ The key comes from the Honey auth response (`encryptionKey`, base64-encoded
> 64-byte). If the key is lost (logout, refresh, new tab), previously encrypted
> local data cannot be read until the user authenticates again and the key is
> re-provided. That is by design.

## Installation

```bash
bun install @pathscale/secure-local-storage-aes-siv
```

## Usage

```ts
import { SecureLocalStorage } from "@pathscale/secure-local-storage-aes-siv";

// Key is the base64 64-byte key from the auth response, kept in memory only.
const store = SecureLocalStorage.getInstance({ encryptionKey: authEncryptionKey });

store.setItem("profile", { id: 1, name: "bee" });
store.getItem("profile"); // -> { id: 1, name: "bee" }
store.removeItem("profile");
store.clear();
```

### Providing the key after construction

The default instance is created **unkeyed**. Reads return `null` and writes
throw until a key is set:

```ts
import secureLocalStorage from "@pathscale/secure-local-storage-aes-siv";

secureLocalStorage.hasEncryptionKey(); // false

// after login, when the in-memory key becomes available:
secureLocalStorage.setEncryptionKey(authEncryptionKey);

// on logout:
secureLocalStorage.clearEncryptionKey();
```

### Low-level encryption manager

```ts
import { EncryptionManager } from "@pathscale/secure-local-storage-aes-siv";

const mgr = new EncryptionManager(authEncryptionKey); // base64 or Uint8Array(64)
const envelope = mgr.encrypt({ any: "json-serializable value" });
const value = mgr.decrypt(envelope);
```

## Storage envelope

```jsonc
{
  "alg": "AES-SIV",
  "v": 1,
  "ct": "<base64 AES-SIV output (ciphertext + synthetic IV/tag)>"
}
```

No nonce field. `alg` and `v` are bound as associated data, so tampering with
either causes decryption to fail.

## API

| Export | Purpose |
| --- | --- |
| `SecureLocalStorage` | Singleton localStorage wrapper. `getInstance({ encryptionKey })`, `setItem/getItem/removeItem/clear/keys/length`, `setEncryptionKey/clearEncryptionKey/hasEncryptionKey`. |
| `EncryptionManager` | Low-level AES-SIV encrypt/decrypt. `new EncryptionManager(key?)`, `encrypt`, `decrypt`, `updateSecretKey`, `hasKey`, `isValidEncryptedData`. |
| `KEY_BYTES` | `64`. |
| `InvalidEncryptionKeyError` | Key is not exactly 64 bytes / not valid base64. |
| `MissingEncryptionKeyError` | Operation attempted while unkeyed. |
| `DecryptionError` | Malformed envelope, wrong key, tamper, or alg/version mismatch. |
| `base64ToBytes` / `bytesToBase64` / `stringToBytes` / `bytesToString` / `InvalidBase64Error` | Encoding helpers. |

## Security notes

- Keep the key in memory only. Do not log the key or plaintext.
- AES-SIV is deterministic: identical plaintext under the same key yields
  identical ciphertext. Do not use this for values where equality leakage
  matters (e.g. low-entropy secrets you compare by ciphertext).
- Losing the key makes existing encrypted entries unreadable until re-keyed.

## Scripts

```bash
bun install
bun run typecheck
bun run test
bun run build
```

## License

MIT
