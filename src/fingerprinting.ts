import type { BrowserFingerprint, FingerprintProperty } from './types';

/**
 * Browser fingerprinting utility for generating unique browser identifiers
 */
export class BrowserFingerprinting {
	private disabledKeys: Set<FingerprintProperty>;

	constructor(disabledKeys: FingerprintProperty[] = []) {
		this.disabledKeys = new Set(disabledKeys);
	}

	/**
	 * Generate a comprehensive browser fingerprint
	 */
	public generateFingerprint(): BrowserFingerprint {
		return {
			userAgent: this.isEnabled('UserAgent') ? this.getUserAgent() : '',
			screenPrint: this.isEnabled('ScreenPrint') ? this.getScreenPrint() : '',
			plugins: this.isEnabled('Plugins') ? this.getPlugins() : '',
			fonts: this.isEnabled('Fonts') ? this.getFonts() : '',
			localStorage: this.isEnabled('LocalStorage') ? this.hasLocalStorage() : false,
			sessionStorage: this.isEnabled('SessionStorage') ? this.hasSessionStorage() : false,
			timeZone: this.isEnabled('TimeZone') ? this.getTimeZone() : '',
			language: this.isEnabled('Language') ? this.getLanguage() : '',
			systemLanguage: this.isEnabled('SystemLanguage') ? this.getSystemLanguage() : '',
			cookie: this.isEnabled('Cookie') ? this.hasCookieSupport() : false,
			canvas: this.isEnabled('Canvas') ? this.getCanvasFingerprint() : '',
			hostname: this.isEnabled('Hostname') ? this.getHostname() : '',
		};
	}

	/**
	 * Convert fingerprint to a hash string
	 */
	public fingerprintToString(fingerprint: BrowserFingerprint): string {
		return Object.values(fingerprint)
			.map((value) => String(value))
			.join('|');
	}

	private isEnabled(property: FingerprintProperty): boolean {
		return !this.disabledKeys.has(property);
	}

	private getUserAgent(): string {
		return typeof navigator !== 'undefined' ? navigator.userAgent : '';
	}

	private getScreenPrint(): string {
		if (typeof screen === 'undefined') return '';
		return `${screen.width}x${screen.height}x${screen.colorDepth}`;
	}

	private getPlugins(): string {
		if (typeof navigator === 'undefined' || !navigator.plugins) return '';
		const plugins = Array.from(navigator.plugins)
			.map((plugin) => plugin.name)
			.sort()
			.join(',');
		return plugins;
	}

	private getFonts(): string {
		// Basic font detection using canvas
		if (typeof document === 'undefined') return '';

		const fonts = [
			'Arial',
			'Helvetica',
			'Times New Roman',
			'Times',
			'Courier New',
			'Courier',
			'Verdana',
			'Georgia',
			'Palatino',
			'Garamond',
			'Bookman',
			'Comic Sans MS',
			'Trebuchet MS',
			'Arial Black',
			'Impact',
			'Sans-serif',
			'Serif',
			'Monospace',
		];

		const availableFonts: string[] = [];
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');

		if (!context) return '';

		fonts.forEach((font) => {
			context.font = `12px ${font}, monospace`;
			const width1 = context.measureText('mmmmmmmmmmlli').width;

			context.font = `12px ${font}, sans-serif`;
			const width2 = context.measureText('mmmmmmmmmmlli').width;

			if (width1 !== width2) {
				availableFonts.push(font);
			}
		});

		return availableFonts.join(',');
	}

	private hasLocalStorage(): boolean {
		try {
			return typeof localStorage !== 'undefined';
		} catch {
			return false;
		}
	}

	private hasSessionStorage(): boolean {
		try {
			return typeof sessionStorage !== 'undefined';
		} catch {
			return false;
		}
	}

	private getTimeZone(): string {
		try {
			return Intl.DateTimeFormat().resolvedOptions().timeZone;
		} catch {
			return new Date().getTimezoneOffset().toString();
		}
	}

	private getLanguage(): string {
		if (typeof navigator === 'undefined') return '';
		return navigator.language || '';
	}

	private getSystemLanguage(): string {
		if (typeof navigator === 'undefined') return '';
		const extendedNavigator = navigator as Navigator & {
			systemLanguage?: string;
		};
		return extendedNavigator.systemLanguage || navigator.language || '';
	}

	private hasCookieSupport(): boolean {
		if (typeof document === 'undefined') return false;
		return navigator.cookieEnabled;
	}

	private getCanvasFingerprint(): string {
		if (typeof document === 'undefined') return '';

		try {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');

			if (!ctx) return '';

			// Draw some text and shapes to create a unique canvas fingerprint
			ctx.textBaseline = 'top';
			ctx.font = '14px Arial';
			ctx.fillStyle = '#f60';
			ctx.fillRect(125, 1, 62, 20);
			ctx.fillStyle = '#069';
			ctx.fillText('SecureStorage 🔒', 2, 15);
			ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
			ctx.fillText('SecureStorage 🔒', 4, 17);

			return canvas.toDataURL();
		} catch {
			return '';
		}
	}

	private getHostname(): string {
		if (typeof location === 'undefined') return '';
		return location.hostname;
	}
}
