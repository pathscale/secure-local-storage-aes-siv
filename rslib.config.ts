import { defineConfig } from '@rslib/core';

export default defineConfig({
	output: { target: 'web' },
	source: {
		entry: { index: ['./src/**/*.ts'] },
		define: { 'import.meta.env': 'import.meta.env' },
	},
	lib: [
		{
			bundle: false,
			dts: { bundle: false },
			format: 'esm',
			outBase: './src',
			autoExternal: {
				dependencies: true,
				peerDependencies: true,
			},
		},
	],
});
