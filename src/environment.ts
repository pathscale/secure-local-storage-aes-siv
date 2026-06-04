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
	public getConfig(): Partial<SecureStorageConfig> {
		return {
			hashKey: this.getHashKey(),
			prefix: this.getPrefix(),
			disabledKeys: this.getDisabledKeys(),
			debug: false,
		};
	}

	private loadEnvironmentVariables(): EnvironmentConfig {
		if (globalThis.process?.env) return globalThis.process.env as EnvironmentConfig;
		if (import.meta.env) return import.meta.env as EnvironmentConfig;
		if (globalThis.window?.__ENV__) return globalThis.window.__ENV__ as EnvironmentConfig;
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
