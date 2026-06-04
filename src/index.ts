export {
  base64ToBytes,
  bytesToBase64,
  bytesToString,
  InvalidBase64Error,
  stringToBytes,
} from "./encoding";
export {
  DecryptionError,
  EncryptionManager,
  InvalidEncryptionKeyError,
  KEY_BYTES,
  MissingEncryptionKeyError,
} from "./encryption";
export { EnvironmentManager } from "./environment";
export { BrowserFingerprinting } from "./fingerprinting";
export { SecureLocalStorage } from "./SecureLocalStorage";
export * from "./types";

// Default instance for convenience. Constructed unkeyed - callers must supply
// the 64-byte key via setEncryptionKey (or getInstance({ encryptionKey }))
// before reading/writing.
import { SecureLocalStorage } from "./SecureLocalStorage";

const secureLocalStorage = SecureLocalStorage.getInstance();

export default secureLocalStorage;
