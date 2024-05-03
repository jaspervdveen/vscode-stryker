# Stryker Mutator
This extension provides seamless integration with [StrykerJS](https://stryker-mutator.io/docs/stryker-js/introduction/), a mutation testing framework that supports most JavaScript projects, including TypeScript, React, Angular, VueJS, Svelte, and NodeJS.

This extension allows you to easily run mutation tests directly within Visual Studio Code. With this extension, you can quickly identify weak spots in your codebase and improve the overall quality of your projects.

## What is mutation testing?
Mutation testing introduces bugs, or mutants to your code, then your tests are run for each mutant. It is expected that your tests will now fail. If your tests fail then the mutant is killed. If your tests passed, the mutant survived. If you have survived mutants, it might indicate your tests do not sufficiently cover the code. The higher the percentage of mutants killed, the more effective your tests are.

Take a look at our [introduction page](https://stryker-mutator.io/docs/).

## Features

### Test Explorer Integration
Effortlessly navigate through mutants in your project via the Test Explorer view. Find mutants and run mutation tests per folder, per file or individually. Get visual feedback on the status of mutants within your code and easily navigate to mutants in your codebase directly from the Test Explorer.

![test-explorer-feature](images/test-explorer.gif)

### Code annotations
Easily test mutations right where they're written using the test icon in your code editor. You'll see the status of each tested mutation right next to your code. Plus, with the code diff view, you can quickly spot the changes Stryker made to your code.

![code-editor-feature](images/code-editor.gif)

## Requirements

To use this extension, ensure that you have StrykerJS installed in your project.

Take a look at our guide: [Install StrykerJS in your project](https://stryker-mutator.io/docs/stryker-js/getting-started/)

## Extension Settings
This extension contributes the following settings:

* `stryker-mutator.mutationServerExecutablePath`: Set the path to the mutation server executable. 
* `stryker-mutator.mutationServerPort`: Set the port on which the mutation server will run.

## Troubleshooting
We’d love to get your help in making this extension better! If you have feedback or encounter any problems, please reach out on our GitHub repository.

## For more information

* [Stryker Mutator](https://stryker-mutator.io/)