import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.spec.js',
	workspaceFolder: './test/resources/empty-workspace',
	launchArgs: [
		'--disable-extensions'
	],
	mocha: {
		ui: 'bdd',
		require: ["./out/test/setup.js"]
	}
});
