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
			hashKey: config.hashKey || envConfig.hashKey || this.generateDefaultHashKey(),
			prefix: config.prefix || envConfig.prefix || 'sls_',
			disabledKeys: config.disabledKeys || envConfig.disabledKeys || [],
			debug: config.debug || envConfig.debug || false,
		};

		this.storageEngine = this.getStorageEngine();
		this.prefix = this.config.prefix || 'sls_';
		this.memoryCache = new Map();

		const secretKey = this.generateSecretKey();
		this.encryption = new EncryptionManager(secretKey);

		this.isInitialized = true;
		this.initializeFromStorage();

		if (this.config.debug) {
			console.log('SecureLocalStorage initialized with config:', this.config);
		}
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
		const oldConfig = { ...this.config };
		this.config = { ...this.config, ...newConfig };

		// Regenerate secret key if hash key changed
		if (oldConfig.hashKey !== this.config.hashKey) {
			const newSecretKey = this.generateSecretKey();
			this.encryption.updateSecretKey(newSecretKey);
		}

		if (this.config.debug) {
			console.log('Configuration updated:', this.config);
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

	private generateDefaultHashKey(): string {
		return 'secure-local-storage-default-key';
	}

	private generateSecretKey(): string {
		return this.config.hashKey || this.generateDefaultHashKey();
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
