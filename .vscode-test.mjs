import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.spec.js',
	workspaceFolder: './test/resources/empty-workspace',
	mocha: {
		require: ["./out/test/setup.js"]
	}
});
