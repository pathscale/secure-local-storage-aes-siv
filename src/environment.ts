import type { EnvironmentConfig, FingerprintProperty, SecureStorageConfig } from './types';

/**
 * Environment configuration manager for different frameworks
 */
export class EnvironmentManager {
	private config: EnvironmentConfig;

	constructor() {
		this.config = this.loadEnvironmentVariables();
	}

	/**
	 * Get configuration from environment variables
	 */
	public getConfig(): SecureStorageConfig {
		const hashKey = this.getHashKey();
		const prefix = this.getPrefix();
		const disabledKeys = this.getDisabledKeys();

		const config: SecureStorageConfig = {
			disabledKeys,
			debug: false,
		};

		if (hashKey) config.hashKey = hashKey;
		if (prefix) config.prefix = prefix;

		return config;
	}

	private loadEnvironmentVariables(): EnvironmentConfig {
		// Handle different environments with proper typing
		const globalProcess = (globalThis as { process?: { env?: Record<string, string> } }).process;
		if (globalProcess?.env) {
			return globalProcess.env as EnvironmentConfig;
		}

		// Handle Vite environment
		const importMeta = import.meta as { env?: Record<string, string> };
		if (typeof import.meta !== 'undefined' && importMeta.env) {
			return importMeta.env as EnvironmentConfig;
		}

		// Handle browser environment with injected variables
		const globalWindow = window as { __ENV__?: Record<string, string> };
		if (typeof window !== 'undefined' && globalWindow.__ENV__) {
			return globalWindow.__ENV__ as EnvironmentConfig;
		}

		return {};
	}

	private getHashKey(): string | undefined {
		return (
			this.config.REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY ||
			this.config.VITE_SECURE_LOCAL_STORAGE_HASH_KEY ||
			this.config.NEXT_PUBLIC_SECURE_LOCAL_STORAGE_HASH_KEY ||
			this.config.SECURE_LOCAL_STORAGE_HASH_KEY
		);
	}

	private getPrefix(): string | undefined {
		return (
			this.config.REACT_APP_SECURE_LOCAL_STORAGE_PREFIX ||
			this.config.VITE_SECURE_LOCAL_STORAGE_PREFIX ||
			this.config.NEXT_PUBLIC_SECURE_LOCAL_STORAGE_PREFIX ||
			this.config.SECURE_LOCAL_STORAGE_PREFIX
		);
	}

	private getDisabledKeys(): FingerprintProperty[] {
		const disabledKeysStr =
			this.config.REACT_APP_SECURE_LOCAL_STORAGE_DISABLED_KEYS ||
			this.config.VITE_SECURE_LOCAL_STORAGE_DISABLED_KEYS ||
			this.config.NEXT_PUBLIC_SECURE_LOCAL_STORAGE_DISABLED_KEYS ||
			this.config.SECURE_LOCAL_STORAGE_DISABLED_KEYS;

		if (!disabledKeysStr) return [];

		return disabledKeysStr
			.split('|')
			.filter((key) => key.trim())
			.map((key) => key.trim() as FingerprintProperty);
	}
}
