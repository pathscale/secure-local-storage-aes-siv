export { EncryptionManager } from './encryption';
export { EnvironmentManager } from './environment';
export { BrowserFingerprinting } from './fingerprinting';
export { SecureLocalStorage } from './SecureLocalStorage';
export * from './types';

// Default instance for convenience
import { SecureLocalStorage } from './SecureLocalStorage';

/**
 * Default secure local storage instance
 */
const secureLocalStorage = SecureLocalStorage.getInstance();

export default secureLocalStorage;
