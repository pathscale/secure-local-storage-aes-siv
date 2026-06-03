/**
 * Global type definitions for secure-local-storage
 */

declare global {
	interface ImportMeta {
		env?: Record<string, string>;
	}

	interface Window {
		__ENV__?: Record<string, string>;
	}

	namespace NodeJS {
		interface Process {
			env: Record<string, string>;
		}
	}
}

// Extend Navigator interface for legacy browser properties
interface ExtendedNavigator extends Navigator {
	systemLanguage?: string;
	browserLanguage?: string;
}

export {};
