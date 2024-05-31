# Package bundling

* Status: accepted
* Deciders: Jasper van der Veen
* Date: 30-05-2024

## Decision Outcome
It has been decided to bundle the Visual Studio Code extension using Webpack. Bundling is the process of combining multiple small source files into a single file.

## Decision Rationale 
Bundling makes sure the package works for everyone using VS Code on any platform. Only bundled extensions can be used in VS Code for Web environments like github.dev and vscode.dev. When VS Code is running in the browser, it can only load one file for your extension so the extension code needs to be bundled into one single web-friendly JavaScript file.

Furthermore, as the extension grows in size and complexity, bundling becomes increasingly advantageous. Loading numerous small files, such as npm packages, individually is significantly slower than loading a single, consolidated file. By bundling the extension, both the package size and the loading time is reduced, enhancing the overall user experience.

The choice of Webpack for bundling was made because VS Code documentation recommends both esbuild and Webpack. While esbuild is known for its speed and efficiency, using it proved challenging due to compatibility issues. Given these challenges and the extensive documentation and community support available for Webpack, it was deemed the more practical choice.

## Consequences
While the primary codebase of the extension will be bundled, there is no necessity to webpack unit tests since they are not part of the published extension. Unit tests can be executed using a simple compile process, which allows for faster testing cycles and easier debugging during development.

Additionally, developers working on this extension may need to familiarize themselves with the bundling tool Webpack, which could involve a learning curve.