# Mutation Server Protocol

* Status: accepted
* Deciders: Jasper van der Veen, Danny Berkelaar
* Date: 24-04-2024

## Context and Problem Statement

When integrating Stryker platforms with a VSCode extension and potentially extending compatibility to other IDEs, what communication method would be most effective?

## Considered Options

* Use existing CLI infrastructure
    
* Use a Mutation Server Protocol

## Decision Outcome
Use a Mutation Server Protocol

## Decision Rationale 
The Mutation Server Protocol was chosen for the following reasons:

1. **Reduced Complexity:** By implementing a Mutation Server Protocol, the complexity of supporting mutation testing frameworks in various IDEs is reduced to a m-plus-n complexity problem.
  
2. **Framework Agnostic:** This approach eliminates the need for mutation testing framework-specific implementations in an extension, making it easy to extend the extension's compatibility to different Stryker platforms and other mutation testing frameworks.
  
3. **Improved Performance:** The protocol allows for processes to be kept in memory on the server-side, potentially improving performance by reducing startup times.

4. **Minimal Changes Required:** Existing public APIs, such as the Stryker CLI, do not require modifications, streamlining the implementation process.

## Pros and Cons of the Options

### Use existing CLI infrastructure
This approach involves invoking the Stryker's CLI from within the IDE's extension. The extension would spawn a child process of the Stryker CLI executable (platform-specific), passing configuration options via command-line arguments. Once the mutation testing run is complete, the extension would collect the results either through existing reporters provided by Stryker or by implementing new reporters.

* Pro: it utilizes existing CLI infrastructure.
* Con: it requires modifications to Stryker's public API to accommodate new functionalities such as an instrument run, increasing complexity.
* Con: platform-specific implementations are needed for different Stryker versions, leading to potential compatibility issues and introducing a m-times-n complexity problem.
* Con: no ability to improve performance by keeping processes in memory.

### Communicate via Mutation Server Protocol

This option involves establishing a Mutation Server Protocol, akin to the Language Server Protocol, for communication between the IDE extension and the mutation testing framework. The protocol utilizes JSON-RPC 2.0 messages for communication. 

* Pro: it reduce the m-times-n complexity problem of providing support for any mutation testing framework in any IDE to a simpler m-plus-n problem.
* Pro: it eliminates the need for framework-specific implementations, enhancing compatibility.
* Pro: there is potential for improved performance by keeping processes in memory on the server-side.
* Pro: it does not require changes to existing public APIs, ensuring compatibility with current infrastructure.
* Con: initial implementation overhead may be higher compared to utilizing existing CLI commands.
* Con: it requires the development of a protocol and associated infrastructure.