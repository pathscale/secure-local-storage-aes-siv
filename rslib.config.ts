import { defineConfig } from '@rslib/core';

export default defineConfig({
	output: { target: 'web' },
	source: { entry: { index: ['./src/**/*.ts'] } },
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
