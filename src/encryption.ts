import { aessiv } from '@noble/ciphers/aes.js';
import { base64ToBytes, bytesToBase64, bytesToString, stringToBytes } from './encoding';
import type { EncryptedStorageItem, StorageValue } from './types';

/**
 * AES-SIV (RFC 5297) authenticated encryption layer.
 *
 * Contract:
 *   - key MUST be exactly 64 raw bytes (AES-256-SIV / 512 bits), supplied as a
 *     base64 string (as returned by Honey auth) or a raw Uint8Array.
 *   - AES-SIV is nonce-misuse-resistant: the synthetic IV is derived from the
 *     plaintext + AAD, so NO nonce is generated, stored, or required by the FE.
 *   - the envelope's {alg, version} are bound as associated data, so a tampered
 *     alg/version causes authentication failure on decrypt.
 *   - never logs key material or plaintext.
 */

const ALGORITHM = 'AES-SIV' as const;
const ENVELOPE_VERSION = 1 as const;
export const KEY_BYTES = 64;

export class InvalidEncryptionKeyError extends Error {
	constructor(message = `Encryption key must be exactly ${KEY_BYTES} raw bytes`) {
		super(message);
		this.name = 'InvalidEncryptionKeyError';
	}
}

export class MissingEncryptionKeyError extends Error {
	constructor(message = 'No encryption key set on EncryptionManager') {
		super(message);
		this.name = 'MissingEncryptionKeyError';
	}
}

export class DecryptionError extends Error {
	constructor(message = 'Failed to decrypt or authenticate data') {
		super(message);
		this.name = 'DecryptionError';
	}
}

interface AesSivEncryptedEnvelope {
	alg: typeof ALGORITHM;
	v: typeof ENVELOPE_VERSION;
	ct: string;
}

/**
 * Normalizes a key input to exactly 64 raw bytes or throws.
 * Accepts a base64 string (Honey auth contract) or a raw Uint8Array.
 */
const normalizeKey = (key: string | Uint8Array): Uint8Array => {
	let bytes: Uint8Array;
	if (key instanceof Uint8Array) {
		bytes = key;
	} else if (typeof key === 'string') {
		try {
			bytes = base64ToBytes(key);
		} catch {
			throw new InvalidEncryptionKeyError('Encryption key is not valid base64');
		}
	} else {
		throw new InvalidEncryptionKeyError();
	}

	if (bytes.length !== KEY_BYTES) {
		throw new InvalidEncryptionKeyError();
	}
	return bytes.slice();
};

export class EncryptionManager {
	private secretKey: Uint8Array | null = null;

	/**
	 * @param secretKey optional base64 string or 64-byte Uint8Array. When omitted,
	 *   the manager is unkeyed and encrypt/decrypt throw MissingEncryptionKeyError
	 *   until a valid key is provided via {@link updateSecretKey}.
	 */
	constructor(secretKey?: string | Uint8Array) {
		if (secretKey !== undefined && secretKey !== '') {
			this.secretKey = normalizeKey(secretKey);
		}
	}

	/** Whether a valid 64-byte key is currently loaded. */
	public hasKey(): boolean {
		return this.secretKey !== null;
	}

	/**
	 * Replace the secret key. Pass null/undefined/'' to clear (zeroizes the
	 * previous key). A non-empty value must resolve to exactly 64 bytes or throws.
	 */
	public updateSecretKey(newSecretKey?: string | Uint8Array | null): void {
		const next =
			newSecretKey === undefined || newSecretKey === null || newSecretKey === '' ? null : normalizeKey(newSecretKey);
		if (this.secretKey) this.secretKey.fill(0);
		this.secretKey = next;
	}

	/** Encrypt a storage value into a JSON envelope string. */
	public encrypt(data: StorageValue): string {
		const key = this.requireKey();

		const item: EncryptedStorageItem = {
			data: this.serializeData(data),
			type: this.getDataType(data),
			timestamp: Date.now(),
			version: String(ENVELOPE_VERSION),
		};

		const plaintext = stringToBytes(JSON.stringify(item));
		const ciphertext = aessiv(key, this.associatedData()).encrypt(plaintext);

		const envelope: AesSivEncryptedEnvelope = {
			alg: ALGORITHM,
			v: ENVELOPE_VERSION,
			ct: bytesToBase64(ciphertext),
		};
		return JSON.stringify(envelope);
	}

	/**
	 * Decrypt a JSON envelope string back to its StorageValue.
	 * @throws {DecryptionError} on malformed envelope, wrong key, tampered
	 *   ciphertext, or alg/version mismatch.
	 */
	public decrypt(encryptedData: string): StorageValue {
		const key = this.requireKey();

		let envelope: unknown;
		try {
			envelope = JSON.parse(encryptedData);
		} catch {
			throw new DecryptionError('Encrypted data is not valid JSON');
		}

		if (!this.isAesSivEnvelope(envelope)) {
			throw new DecryptionError('Unsupported or mismatched encrypted data format');
		}

		let plaintext: Uint8Array;
		try {
			const ciphertext = base64ToBytes(envelope.ct);
			plaintext = aessiv(key, this.associatedData()).decrypt(ciphertext);
		} catch {
			throw new DecryptionError();
		}

		let item: EncryptedStorageItem;
		try {
			item = JSON.parse(bytesToString(plaintext));
		} catch {
			throw new DecryptionError('Decrypted payload is not valid JSON');
		}
		return this.deserializeData(item.data, item.type);
	}

	/** True if the data is a well-formed envelope that decrypts under this key. */
	public isValidEncryptedData(encryptedData: string): boolean {
		try {
			this.decrypt(encryptedData);
			return true;
		} catch {
			return false;
		}
	}

	private requireKey(): Uint8Array {
		if (!this.secretKey) throw new MissingEncryptionKeyError();
		return this.secretKey;
	}

	/** Authenticated metadata binding - protects against alg/version swaps. */
	private associatedData(): Uint8Array {
		return stringToBytes(`${ALGORITHM}:${ENVELOPE_VERSION}`);
	}

	private serializeData(data: StorageValue): string {
		if (data === null || data === undefined) return '';
		if (typeof data === 'object') return JSON.stringify(data);
		return String(data);
	}

	private deserializeData(serializedData: string, type: string): StorageValue {
		if (type === 'null') return null;
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
		return envelope.alg === ALGORITHM && envelope.v === ENVELOPE_VERSION && typeof envelope.ct === 'string';
	}
}
