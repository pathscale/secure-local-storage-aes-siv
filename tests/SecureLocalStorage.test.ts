import { beforeEach, describe, expect, test } from 'bun:test';

// Minimal localStorage polyfill so the wrapper exercises its real persistence
// path (rather than the per-instance MemoryStorage fallback) under bun test.
class LocalStoragePolyfill {
	private map = new Map<string, string>();
	getItem(k: string): string | null {
		return this.map.has(k) ? (this.map.get(k) as string) : null;
	}
	setItem(k: string, v: string): void {
		this.map.set(k, String(v));
	}
	removeItem(k: string): void {
		this.map.delete(k);
	}
	clear(): void {
		this.map.clear();
	}
	key(i: number): string | null {
		return Array.from(this.map.keys())[i] ?? null;
	}
	get length(): number {
		return this.map.size;
	}
}
(globalThis as { localStorage?: unknown }).localStorage = new LocalStoragePolyfill();

import { bytesToBase64 } from '../src/encoding';
import { KEY_BYTES } from '../src/encryption';
import { SecureLocalStorage } from '../src/SecureLocalStorage';

const KEY = bytesToBase64(new Uint8Array(KEY_BYTES).fill(7));

// Each test builds a fresh isolated instance via the internal constructor so the
// process-wide singleton and localStorage state don't bleed across tests.
const makeStore = (config: Record<string, unknown> = {}) =>
	// biome-ignore lint/suspicious/noExplicitAny: access private ctor for isolation
	new (SecureLocalStorage as any)({ prefix: `t_${Math.random().toString(36).slice(2)}_`, ...config });

describe('SecureLocalStorage with a key', () => {
	let store: SecureLocalStorage;
	beforeEach(() => {
		(globalThis as { localStorage: LocalStoragePolyfill }).localStorage.clear();
		store = makeStore({ encryptionKey: KEY });
	});

	test('set/get/remove/clear roundtrip', () => {
		store.setItem('user', { id: 1, name: 'bee' });
		expect(store.getItem('user')).toEqual({ id: 1, name: 'bee' });

		store.setItem('flag', true);
		expect(store.getItem('flag')).toBe(true);

		store.removeItem('user');
		expect(store.getItem('user')).toBe(null);

		store.clear();
		expect(store.getItem('flag')).toBe(null);
		expect(store.keys().length).toBe(0);
	});

	test('persisted value on disk is ciphertext, not plaintext', () => {
		store.setItem('token', 'super-secret-value');
		// Inspect raw localStorage: the plaintext must not appear.
		let found = false;
		for (let i = 0; i < localStorage.length; i += 1) {
			const k = localStorage.key(i);
			if (!k) continue;
			const raw = localStorage.getItem(k) ?? '';
			if (raw.includes('super-secret-value')) found = true;
		}
		expect(found).toBe(false);
	});
});

describe('SecureLocalStorage key lifecycle', () => {
	test('unkeyed store: setItem throws, getItem returns null', () => {
		const store = makeStore();
		expect(store.hasEncryptionKey()).toBe(false);
		expect(() => store.setItem('x', '1')).toThrow();
		expect(store.getItem('x')).toBe(null);
	});

	test('setEncryptionKey enables storage; clearEncryptionKey disables it', () => {
		const store = makeStore();
		store.setEncryptionKey(KEY);
		expect(store.hasEncryptionKey()).toBe(true);
		store.setItem('x', 'value');
		expect(store.getItem('x')).toBe('value');

		store.clearEncryptionKey();
		expect(store.hasEncryptionKey()).toBe(false);
		expect(store.getItem('x')).toBe(null); // cache cleared + unkeyed
	});

	test('rejects an invalid key length', () => {
		const store = makeStore();
		expect(() => store.setEncryptionKey(bytesToBase64(new Uint8Array(32)))).toThrow();
	});
});
