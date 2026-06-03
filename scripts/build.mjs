import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
import config from '../rollup.config.mjs';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configs = Array.isArray(config) ? config : [config];

try {
	await rm(resolve(rootDir, 'dist'), { recursive: true, force: true });

	for (const inputOptions of configs) {
		const { output, ...options } = inputOptions;
		const bundle = await rollup(options);

		try {
			const outputs = Array.isArray(output) ? output : [output];
			for (const outputOptions of outputs) {
				await bundle.write(outputOptions);
			}
		} finally {
			await bundle.close();
		}
	}
} catch (error) {
	console.error(error);
	process.exit(1);
}

process.exit(0);
