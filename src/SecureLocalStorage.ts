import { EncryptionManager } from './encryption';
import { EnvironmentManager } from './environment';
import type { SecureStorageConfig, StorageEngine, StorageValue } from './types';

/**
 * Secure Local Storage - A secure, encrypted local storage with browser fingerprinting
 */
export class SecureLocalStorage {
	private static instance: SecureLocalStorage | null = null;
	private encryption: EncryptionManager;
	private environment: EnvironmentManager;
	private config: SecureStorageConfig;
	private storageEngine: StorageEngine;
	private prefix: string;
	private memoryCache: Map<string, StorageValue>;
	private isInitialized: boolean = false;

	private constructor(config: Partial<SecureStorageConfig> = {}) {
		this.environment = new EnvironmentManager();
		const envConfig = this.environment.getConfig();

		// Merge environment config with provided config
		this.config = {
			encryptionKey: config.encryptionKey,
			prefix: config.prefix || envConfig.prefix || 'sls_',
			disabledKeys: config.disabledKeys || envConfig.disabledKeys || [],
			debug: config.debug || envConfig.debug || false,
		};

		this.storageEngine = this.getStorageEngine();
		this.prefix = this.config.prefix || 'sls_';
		this.memoryCache = new Map();

		// Unkeyed unless a valid 64-byte key was supplied. No weak default key.
		this.encryption = new EncryptionManager(this.config.encryptionKey);

		this.isInitialized = true;
		if (this.encryption.hasKey()) {
			this.initializeFromStorage();
		}

		if (this.config.debug) {
			console.log('SecureLocalStorage initialized (keyed:', this.encryption.hasKey(), ')');
		}
	}

	/**
	 * Provide or replace the in-memory AES-SIV key (base64 string or 64-byte
	 * Uint8Array). Clears the plaintext cache so subsequent reads decrypt under
	 * the new key. Throws InvalidEncryptionKeyError if the key is not 64 bytes.
	 */
	public setEncryptionKey(key: string | Uint8Array): void {
		this.encryption.updateSecretKey(key);
		this.memoryCache.clear();
		this.initializeFromStorage();
	}

	/** Drop the in-memory key (e.g. on logout) and clear the plaintext cache. */
	public clearEncryptionKey(): void {
		this.encryption.updateSecretKey(null);
		this.memoryCache.clear();
	}

	/** Whether a usable encryption key is currently loaded. */
	public hasEncryptionKey(): boolean {
		return this.encryption.hasKey();
	}

	/**
	 * Get the singleton instance
	 */
	public static getInstance(config?: Partial<SecureStorageConfig>): SecureLocalStorage {
		if (!SecureLocalStorage.instance) {
			SecureLocalStorage.instance = new SecureLocalStorage(config);
		}
		return SecureLocalStorage.instance;
	}

	/**
	 * Set an item in secure storage
	 */
	public setItem(key: string, value: StorageValue): void {
		if (!this.isInitialized) {
			throw new Error('SecureLocalStorage is not initialized');
		}

		try {
			const encryptedValue = this.encryption.encrypt(value);
			const storageKey = this.getStorageKey(key);

			this.storageEngine.setItem(storageKey, encryptedValue);
			this.memoryCache.set(key, value);

			if (this.config.debug) {
				console.log(`Set item: ${key}`, value);
			}
		} catch (error) {
			console.error('Failed to set item:', error);
			throw new Error(`Failed to set item: ${key}`);
		}
	}

	/**
	 * Get an item from secure storage
	 */
	public getItem(key: string): StorageValue {
		if (!this.isInitialized) {
			throw new Error('SecureLocalStorage is not initialized');
		}

		// First check memory cache for performance
		if (this.memoryCache.has(key)) {
			const value = this.memoryCache.get(key);
			if (this.config.debug) {
				console.log(`Get item from cache: ${key}`, value);
			}
			return value !== undefined ? value : null;
		}

		try {
			const storageKey = this.getStorageKey(key);
			const encryptedValue = this.storageEngine.getItem(storageKey);

			if (!encryptedValue) {
				return null;
			}

			const decryptedValue = this.encryption.decrypt(encryptedValue);
			this.memoryCache.set(key, decryptedValue);

			if (this.config.debug) {
				console.log(`Get item from storage: ${key}`, decryptedValue);
			}

			return decryptedValue;
		} catch (error) {
			console.error('Failed to get item:', error);
			return null;
		}
	}

	/**
	 * Remove an item from secure storage
	 */
	public removeItem(key: string): void {
		if (!this.isInitialized) {
			throw new Error('SecureLocalStorage is not initialized');
		}

		try {
			const storageKey = this.getStorageKey(key);
			this.storageEngine.removeItem(storageKey);
			this.memoryCache.delete(key);

			if (this.config.debug) {
				console.log(`Removed item: ${key}`);
			}
		} catch (error) {
			console.error('Failed to remove item:', error);
			throw new Error(`Failed to remove item: ${key}`);
		}
	}

	/**
	 * Clear all items from secure storage
	 */
	public clear(): void {
		if (!this.isInitialized) {
			throw new Error('SecureLocalStorage is not initialized');
		}

		try {
			// Only remove items with our prefix
			const keysToRemove: string[] = [];

			for (let i = 0; i < this.storageEngine.length; i++) {
				const key = this.storageEngine.key(i);
				if (key?.startsWith(this.prefix)) {
					keysToRemove.push(key);
				}
			}

			keysToRemove.forEach((key) => {
				this.storageEngine.removeItem(key);
			});

			this.memoryCache.clear();

			if (this.config.debug) {
				console.log('Cleared all secure storage items');
			}
		} catch (error) {
			console.error('Failed to clear storage:', error);
			throw new Error('Failed to clear secure storage');
		}
	}

	/**
	 * Get all keys in secure storage
	 */
	public keys(): string[] {
		if (!this.isInitialized) {
			throw new Error('SecureLocalStorage is not initialized');
		}

		const keys: string[] = [];

		for (let i = 0; i < this.storageEngine.length; i++) {
			const key = this.storageEngine.key(i);
			if (key?.startsWith(this.prefix)) {
				// Remove prefix to get original key
				keys.push(key.substring(this.prefix.length));
			}
		}

		return keys;
	}

	/**
	 * Get the number of items in secure storage
	 */
	public length(): number {
		return this.keys().length;
	}

	/**
	 * Update configuration
	 */
	public updateConfig(newConfig: Partial<SecureStorageConfig>): void {
		const keyChanged = 'encryptionKey' in newConfig && newConfig.encryptionKey !== this.config.encryptionKey;
		this.config = { ...this.config, ...newConfig };

		if (keyChanged) {
			this.encryption.updateSecretKey(this.config.encryptionKey ?? null);
			this.memoryCache.clear();
			if (this.encryption.hasKey()) this.initializeFromStorage();
		}

		if (this.config.debug) {
			console.log('Configuration updated (keyed:', this.encryption.hasKey(), ')');
		}
	}

	private getStorageEngine(): StorageEngine {
		if (typeof localStorage !== 'undefined') {
			return localStorage;
		}

		// Fallback to memory storage for environments without localStorage
		return new MemoryStorage();
	}

	private getStorageKey(key: string): string {
		return `${this.prefix}${key}`;
	}

	private initializeFromStorage(): void {
		try {
			const keys = this.keys();

			keys.forEach((key) => {
				try {
					const value = this.getItem(key);
					if (value !== null) {
						this.memoryCache.set(key, value);
					}
				} catch (error) {
					console.warn(`Failed to load item from storage: ${key}`, error);
				}
			});

			if (this.config.debug) {
				console.log(`Loaded ${this.memoryCache.size} items from storage`);
			}
		} catch (error) {
			console.error('Failed to initialize from storage:', error);
		}
	}
}

/**
 * Memory storage fallback for environments without localStorage
 */
class MemoryStorage implements StorageEngine {
	private storage: Map<string, string> = new Map();

	getItem(key: string): string | null {
		return this.storage.get(key) || null;
	}

	setItem(key: string, value: string): void {
		this.storage.set(key, value);
	}

	removeItem(key: string): void {
		this.storage.delete(key);
	}

	clear(): void {
		this.storage.clear();
	}

	key(index: number): string | null {
		const keys = Array.from(this.storage.keys());
		return keys[index] || null;
	}

	get length(): number {
		return this.storage.size;
	}
}
