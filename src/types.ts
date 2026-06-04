/**
 * Configuration options for the secure local storage
 */
export interface SecureStorageConfig {
	/** Custom hash key for encryption */
	hashKey: string;
	/** Prefix for storage keys */
	prefix: string;
	/** Disabled properties for fingerprint generation */
	disabledKeys: FingerprintProperty[];
	/** Enable debug mode */
	debug: boolean;
}

/**
 * Environment configuration for different frameworks
 */
export interface EnvironmentConfig {
	/** React environment prefix */
	REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY?: string;
	REACT_APP_SECURE_LOCAL_STORAGE_PREFIX?: string;
	REACT_APP_SECURE_LOCAL_STORAGE_DISABLED_KEYS?: string;

	/** Vite environment prefix */
	VITE_SECURE_LOCAL_STORAGE_HASH_KEY?: string;
	VITE_SECURE_LOCAL_STORAGE_PREFIX?: string;
	VITE_SECURE_LOCAL_STORAGE_DISABLED_KEYS?: string;

	/** Next.js environment prefix */
	NEXT_PUBLIC_SECURE_LOCAL_STORAGE_HASH_KEY?: string;
	NEXT_PUBLIC_SECURE_LOCAL_STORAGE_PREFIX?: string;
	NEXT_PUBLIC_SECURE_LOCAL_STORAGE_DISABLED_KEYS?: string;

	/** Default environment variables */
	SECURE_LOCAL_STORAGE_HASH_KEY?: string;
	SECURE_LOCAL_STORAGE_PREFIX?: string;
	SECURE_LOCAL_STORAGE_DISABLED_KEYS?: string;
}

/**
 * Browser fingerprint properties
 */
export type FingerprintProperty =
	| 'UserAgent'
	| 'ScreenPrint'
	| 'Plugins'
	| 'Fonts'
	| 'LocalStorage'
	| 'SessionStorage'
	| 'TimeZone'
	| 'Language'
	| 'SystemLanguage'
	| 'Cookie'
	| 'Canvas'
	| 'Hostname';

/**
 * Supported data types for storage
 */
export type StorageValue = string | number | boolean | object | null;

/**
 * Storage engine interface
 */
export interface StorageEngine {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
	clear(): void;
	key(index: number): string | null;
	readonly length: number;
}

/**
 * Encrypted storage item structure
 */
export interface EncryptedStorageItem {
	data: string;
	type: string;
	timestamp: number;
	version: string;
}

/**
 * Browser fingerprint data
 */
export interface BrowserFingerprint {
	userAgent: string;
	screenPrint: string;
	plugins: string;
	fonts: string;
	localStorage: boolean;
	sessionStorage: boolean;
	timeZone: string;
	language: string;
	systemLanguage: string;
	cookie: boolean;
	canvas: string;
	hostname: string;
}
