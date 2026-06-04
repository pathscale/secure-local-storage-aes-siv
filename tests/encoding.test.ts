import { describe, expect, test } from 'bun:test';
import { base64ToBytes, bytesToBase64, bytesToString, InvalidBase64Error, stringToBytes } from '../src/encoding';

describe('encoding utilities', () => {
	test('string <-> bytes roundtrip (unicode)', () => {
		const value = 'café 🐝 日本語';
		expect(bytesToString(stringToBytes(value))).toBe(value);
	});

	test('bytes <-> base64 roundtrip', () => {
		const bytes = new Uint8Array([0, 1, 2, 250, 251, 255]);
		expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
	});

	test('invalid base64 throws InvalidBase64Error', () => {
		expect(() => base64ToBytes('@@@not base64@@@')).toThrow(InvalidBase64Error);
	});

	test('empty base64 input throws', () => {
		expect(() => base64ToBytes('')).toThrow(InvalidBase64Error);
	});
});
