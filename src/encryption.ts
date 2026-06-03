import { aessiv } from '@noble/ciphers/aes.js';
import type { EncryptedStorageItem, StorageValue } from './types';

const ALGORITHM = 'AES-256-SIV';
const KEY_BYTES = 32;
const HEX_KEY_PATTERN = /^[0-9a-f]{64}$/i;
const DEFAULT_SECRET_KEY = new Uint8Array([
	0x70, 0x61, 0x74, 0x68, 0x73, 0x63, 0x61, 0x6c, 0x65, 0x2d, 0x73, 0x6c, 0x73, 0x2d, 0x63, 0x68, 0x61, 0x63, 0x68,
	0x61, 0x32, 0x30, 0x70, 0x6f, 0x6c, 0x79, 0x31, 0x33, 0x30, 0x35, 0x6b, 0x31,
]);

interface AesSivEncryptedEnvelope {
	algorithm: typeof ALGORITHM;
	ciphertext: string;
	version: string;
}

type BufferLike = Uint8Array & {
	toString(encoding?: string): string;
};

type BufferConstructorLike = {
	from(input: string | Uint8Array, encoding?: string): BufferLike;
};

/**
 * Encryption utility for secure data storage
 */
export class EncryptionManager {
	private secretKey: Uint8Array;
	private readonly version = '3.0.0';
	private readonly textEncoder = new TextEncoder();
	private readonly textDecoder = new TextDecoder();

	constructor(secretKey: string = '') {
		this.secretKey = this.loadSecretKey(secretKey);
	}

	/**
	 * Update the secret key
	 */
	public updateSecretKey(newSecretKey: string): void {
		this.secretKey.fill(0);
		this.secretKey = this.loadSecretKey(newSecretKey);
	}

	/**
	 * Encrypt data with type preservation
	 */
	public encrypt(data: StorageValue): string {
		const item: EncryptedStorageItem = {
			data: this.serializeData(data),
			type: this.getDataType(data),
			timestamp: Date.now(),
			version: this.version,
		};

		const serialized = JSON.stringify(item);
		const plaintext = this.textEncoder.encode(serialized);
		const cipher = aessiv(this.secretKey);
		const ciphertext = cipher.encrypt(plaintext);

		const envelope: AesSivEncryptedEnvelope = {
			algorithm: ALGORITHM,
			ciphertext: this.encodeBase64(ciphertext),
			version: this.version,
		};
		return JSON.stringify(envelope);
	}

	/**
	 * Decrypt data with type restoration
	 */
	public decrypt(encryptedData: string): StorageValue {
		try {
			const envelope = JSON.parse(encryptedData);
			if (!this.isAesSivEnvelope(envelope)) {
				throw new Error('Unsupported encrypted data format');
			}

			const ciphertext = this.decodeBase64(envelope.ciphertext);
			const cipher = aessiv(this.secretKey);
			const plaintext = cipher.decrypt(ciphertext);
			if (!plaintext) {
				throw new Error('Failed to authenticate encrypted data');
			}
			const decryptedText = this.textDecoder.decode(plaintext);

			const item: EncryptedStorageItem = JSON.parse(decryptedText);
			return this.deserializeData(item.data, item.type);
		} catch (error) {
			console.warn('Failed to decrypt data:', error);
			return null;
		}
	}

	/**
	 * Validate if data was encrypted with this library
	 */
	public isValidEncryptedData(encryptedData: string): boolean {
		try {
			const envelope = JSON.parse(encryptedData);
			if (!this.isAesSivEnvelope(envelope)) return false;

			const cipher = aessiv(this.secretKey);
			const plaintext = cipher.decrypt(this.decodeBase64(envelope.ciphertext));
			if (!plaintext) return false;
			const item = JSON.parse(this.textDecoder.decode(plaintext));
			return item && typeof item.data !== 'undefined' && typeof item.type === 'string';
		} catch {
			return false;
		}
	}

	private loadSecretKey(key: string): Uint8Array {
		return this.tryParseRawKey(key) || DEFAULT_SECRET_KEY.slice();
	}

	private tryParseRawKey(key: string): Uint8Array | null {
		if (!key) return null;

		if (HEX_KEY_PATTERN.test(key)) {
			const bytes = new Uint8Array(KEY_BYTES);
			for (let index = 0; index < KEY_BYTES; index += 1) {
				bytes[index] = Number.parseInt(key.slice(index * 2, index * 2 + 2), 16);
			}
			return bytes;
		}

		try {
			const decoded = this.decodeBase64(key);
			if (decoded.length === KEY_BYTES) return decoded;
		} catch {
			// Not a base64 key; try raw UTF-8 below.
		}

		const raw = this.textEncoder.encode(key);
		return raw.length === KEY_BYTES ? raw : null;
	}

	private serializeData(data: StorageValue): string {
		if (data === null || data === undefined) {
			return '';
		}

		if (typeof data === 'object') {
			return JSON.stringify(data);
		}

		return String(data);
	}

	private deserializeData(serializedData: string, type: string): StorageValue {
		if (type === 'null' || serializedData === '') {
			return null;
		}

		switch (type) {
			case 'string':
				return serializedData;
			case 'number':
				return Number(serializedData);
			case 'boolean':
				return serializedData === 'true';
			case 'object':
				try {
					return JSON.parse(serializedData);
				} catch {
					return null;
				}
			default:
				return serializedData;
		}
	}

	private getDataType(data: StorageValue): string {
		if (data === null) return 'null';
		if (typeof data === 'object') return 'object';
		return typeof data;
	}

	private isAesSivEnvelope(value: unknown): value is AesSivEncryptedEnvelope {
		if (!value || typeof value !== 'object') return false;
		const envelope = value as Partial<Record<keyof AesSivEncryptedEnvelope, unknown>>;
		return (
			envelope.algorithm === ALGORITHM &&
			typeof envelope.ciphertext === 'string' &&
			typeof envelope.version === 'string'
		);
	}

	private encodeBase64(bytes: Uint8Array): string {
		if (typeof btoa === 'function') {
			let binary = '';
			const chunkSize = 0x8000;
			for (let index = 0; index < bytes.length; index += chunkSize) {
				binary += String.fromCharCode(...Array.from(bytes.subarray(index, index + chunkSize)));
			}
			return btoa(binary);
		}

		const buffer = this.getGlobalBuffer();
		if (buffer) return buffer.from(bytes).toString('base64');

		throw new Error('No base64 encoder available');
	}

	private decodeBase64(value: string): Uint8Array {
		if (typeof atob === 'function') {
			const binary = atob(value);
			const bytes = new Uint8Array(binary.length);
			for (let index = 0; index < binary.length; index += 1) {
				bytes[index] = binary.charCodeAt(index);
			}
			return bytes;
		}

		const buffer = this.getGlobalBuffer();
		if (buffer) return Uint8Array.from(buffer.from(value, 'base64'));

		throw new Error('No base64 decoder available');
	}

	private getGlobalBuffer(): BufferConstructorLike | undefined {
		return (globalThis as typeof globalThis & { Buffer?: BufferConstructorLike }).Buffer;
	}
}
