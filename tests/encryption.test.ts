import { describe, expect, test } from 'bun:test';
import { bytesToBase64 } from '../src/encoding';
import {
	DecryptionError,
	EncryptionManager,
	InvalidEncryptionKeyError,
	KEY_BYTES,
	MissingEncryptionKeyError,
} from '../src/encryption';

const keyBase64 = (fill: number): string => bytesToBase64(new Uint8Array(KEY_BYTES).fill(fill));
const KEY_A = keyBase64(7);
const KEY_B = keyBase64(9);

describe('EncryptionManager key length contract', () => {
	test('accepts a 64-byte base64 key', () => {
		expect(() => new EncryptionManager(KEY_A)).not.toThrow();
		expect(new EncryptionManager(KEY_A).hasKey()).toBe(true);
	});

	test('accepts a raw 64-byte Uint8Array key', () => {
		const mgr = new EncryptionManager(new Uint8Array(KEY_BYTES).fill(3));
		expect(mgr.hasKey()).toBe(true);
	});

	test('a 0-length Uint8Array key is rejected', () => {
		expect(() => new EncryptionManager(new Uint8Array(0))).toThrow(InvalidEncryptionKeyError);
	});

	test('an empty string is the unkeyed sentinel, not an error', () => {
		expect(new EncryptionManager('').hasKey()).toBe(false);
	});

	test.each([32, 63, 65])('rejects a %i-byte key', (len) => {
		const badKey = bytesToBase64(new Uint8Array(len).fill(1));
		expect(() => new EncryptionManager(badKey)).toThrow(InvalidEncryptionKeyError);
		expect(() => new EncryptionManager(new Uint8Array(len))).toThrow(InvalidEncryptionKeyError);
	});

	test('rejects a non-base64 key string', () => {
		expect(() => new EncryptionManager('!!! not base64 !!!')).toThrow(InvalidEncryptionKeyError);
	});

	test('unkeyed manager throws on encrypt/decrypt', () => {
		const mgr = new EncryptionManager();
		expect(mgr.hasKey()).toBe(false);
		expect(() => mgr.encrypt('x')).toThrow(MissingEncryptionKeyError);
		expect(() => mgr.decrypt('{}')).toThrow(MissingEncryptionKeyError);
	});
});

describe('AES-SIV roundtrip', () => {
	const mgr = new EncryptionManager(KEY_A);

	test('string roundtrip', () => {
		const ct = mgr.encrypt('hello world');
		expect(mgr.decrypt(ct)).toBe('hello world');
	});

	test('unicode string roundtrip', () => {
		const value = 'café — ünîçødé 🐝 日本語';
		expect(mgr.decrypt(mgr.encrypt(value))).toBe(value);
	});

	test('empty string roundtrip', () => {
		expect(mgr.decrypt(mgr.encrypt(''))).toBe('');
	});

	test('number roundtrip', () => {
		expect(mgr.decrypt(mgr.encrypt(42))).toBe(42);
	});

	test('boolean roundtrip', () => {
		expect(mgr.decrypt(mgr.encrypt(true))).toBe(true);
	});

	test('object roundtrip', () => {
		const obj = { a: 1, b: [2, 3], c: { d: 'e' } };
		expect(mgr.decrypt(mgr.encrypt(obj))).toEqual(obj);
	});

	test('null roundtrip', () => {
		expect(mgr.decrypt(mgr.encrypt(null))).toBe(null);
	});

	test('different plaintexts decrypt to their own values', () => {
		const a = mgr.encrypt('alpha');
		const b = mgr.encrypt('beta');
		expect(mgr.decrypt(a)).toBe('alpha');
		expect(mgr.decrypt(b)).toBe('beta');
	});
});

describe('AES-SIV determinism', () => {
	test('same key + same plaintext yields identical ciphertext (deterministic)', () => {
		const mgr = new EncryptionManager(KEY_A);
		// timestamp differs per call, so compare the raw cipher via a fixed-payload
		// manager-free check is not possible here; instead assert envelope ct is
		// stable when the serialized item is identical. We freeze time to do so.
		const realNow = Date.now;
		try {
			Date.now = () => 1_000;
			const ct1 = mgr.encrypt('deterministic');
			const ct2 = mgr.encrypt('deterministic');
			expect(ct1).toBe(ct2);
		} finally {
			Date.now = realNow;
		}
	});
});

describe('AES-SIV failure modes', () => {
	test('wrong key fails to decrypt', () => {
		const ct = new EncryptionManager(KEY_A).encrypt('secret');
		expect(() => new EncryptionManager(KEY_B).decrypt(ct)).toThrow(DecryptionError);
	});

	test('tampered ciphertext fails', () => {
		const mgr = new EncryptionManager(KEY_A);
		const envelope = JSON.parse(mgr.encrypt('secret')) as { ct: string };
		// Flip a character in the base64 ciphertext.
		const chars = envelope.ct.split('');
		chars[chars.length - 2] = chars[chars.length - 2] === 'A' ? 'B' : 'A';
		const tampered = JSON.stringify({ ...envelope, ct: chars.join('') });
		expect(() => mgr.decrypt(tampered)).toThrow(DecryptionError);
	});

	test('algorithm mismatch fails', () => {
		const mgr = new EncryptionManager(KEY_A);
		const envelope = JSON.parse(mgr.encrypt('secret'));
		const swapped = JSON.stringify({ ...envelope, alg: 'CHACHA20-POLY1305' });
		expect(() => mgr.decrypt(swapped)).toThrow(DecryptionError);
	});

	test('envelope version mismatch fails', () => {
		const mgr = new EncryptionManager(KEY_A);
		const envelope = JSON.parse(mgr.encrypt('secret'));
		const swapped = JSON.stringify({ ...envelope, v: 2 });
		expect(() => mgr.decrypt(swapped)).toThrow(DecryptionError);
	});

	test('malformed JSON fails', () => {
		const mgr = new EncryptionManager(KEY_A);
		expect(() => mgr.decrypt('not json')).toThrow(DecryptionError);
	});

	test('isValidEncryptedData reflects success/failure', () => {
		const mgr = new EncryptionManager(KEY_A);
		const ct = mgr.encrypt('secret');
		expect(mgr.isValidEncryptedData(ct)).toBe(true);
		expect(new EncryptionManager(KEY_B).isValidEncryptedData(ct)).toBe(false);
	});
});

describe('updateSecretKey', () => {
	test('switching to the original key restores decryptability; clearing disables it', () => {
		const mgr = new EncryptionManager(KEY_A);
		const ct = mgr.encrypt('secret');

		mgr.updateSecretKey(KEY_B);
		expect(() => mgr.decrypt(ct)).toThrow(DecryptionError);

		mgr.updateSecretKey(KEY_A);
		expect(mgr.decrypt(ct)).toBe('secret');

		mgr.updateSecretKey(null);
		expect(mgr.hasKey()).toBe(false);
		expect(() => mgr.decrypt(ct)).toThrow(MissingEncryptionKeyError);
	});

	test('rejects an invalid replacement key', () => {
		const mgr = new EncryptionManager(KEY_A);
		expect(() => mgr.updateSecretKey(bytesToBase64(new Uint8Array(32)))).toThrow(InvalidEncryptionKeyError);
	});
});
