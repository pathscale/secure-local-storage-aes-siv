/**
 * Browser- and Node/Bun-safe encoding helpers.
 *
 * Never logs key material or plaintext. Invalid base64 throws a controlled
 * {@link InvalidBase64Error} rather than leaking the offending value.
 */

export class InvalidBase64Error extends Error {
	constructor(message = 'Invalid base64 input') {
		super(message);
		this.name = 'InvalidBase64Error';
	}
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type BufferLike = Uint8Array & { toString(encoding?: string): string };
type BufferConstructorLike = {
	from(input: string | Uint8Array, encoding?: string): BufferLike;
};

const getGlobalBuffer = (): BufferConstructorLike | undefined =>
	(globalThis as typeof globalThis & { Buffer?: BufferConstructorLike }).Buffer;

/** UTF-8 string -> bytes. */
export const stringToBytes = (value: string): Uint8Array => textEncoder.encode(value);

/** bytes -> UTF-8 string. */
export const bytesToString = (bytes: Uint8Array): string => textDecoder.decode(bytes);

/** bytes -> base64 (standard alphabet, padded). */
export const bytesToBase64 = (bytes: Uint8Array): string => {
	if (typeof btoa === 'function') {
		let binary = '';
		const chunkSize = 0x8000;
		for (let i = 0; i < bytes.length; i += chunkSize) {
			binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
		}
		return btoa(binary);
	}

	const buffer = getGlobalBuffer();
	if (buffer) return buffer.from(bytes).toString('base64');

	throw new Error('No base64 encoder available in this environment');
};

/**
 * base64 -> bytes. Throws {@link InvalidBase64Error} for malformed input.
 */
export const base64ToBytes = (value: string): Uint8Array => {
	if (typeof value !== 'string' || value.length === 0) {
		throw new InvalidBase64Error('Base64 input must be a non-empty string');
	}

	if (typeof atob === 'function') {
		let binary: string;
		try {
			binary = atob(value);
		} catch {
			throw new InvalidBase64Error();
		}
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i += 1) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	}

	const buffer = getGlobalBuffer();
	if (buffer) {
		try {
			return Uint8Array.from(buffer.from(value, 'base64'));
		} catch {
			throw new InvalidBase64Error();
		}
	}

	throw new Error('No base64 decoder available in this environment');
};
