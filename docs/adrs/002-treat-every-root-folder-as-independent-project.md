# Treat every root folder as an independent project

* Status: accepted
* Deciders: Jasper van der Veen 
* Date: 2024-04-29

## Context and Problem Statement

When using Visual Studio Code with multi-root workspaces, users can work on multiple related projects simultaneously. However, this raises the question of how to handle this scenario within our extension regarding mutation servers.

## Considered Options

* Single mutation server per workspace
* Mutation server per root folder in workspace

## Decision Outcome
The decision has been made to treat each root folder as an individual project and consequently spawn a mutation server per root folder.

## Decision Rationale
By treating each root folder as an independent project entity, it is ensured that projects can utilize different mutation testing frameworks or versions without conflicts. This approach also streamlines management, eliminating the need for complex mappings or configurations.

## Pros and Cons of the Option

### Single Mutation Server

* **Pros:**
  - Prevents spawning multiple mutation servers for a single workspace.

* **Cons:**
  - Each project may use different mutation testing frameworks or versions, necessitating different mutation servers.
  - Stryker resolves files from the process's current working directory, making it challenging to support multiple projects without complex changes.
  - Mutation servers are resolved from the project's modules and not stored in the extension itself.
  - Future performance improvements may require mutation servers to keep state, necessitating mapping requests to projects and introducing complexity.

### Mutation Server per Root Folder

* **Pros:**
  - Each project operates independently, allowing for different mutation testing frameworks or versions.
  - Simplifies management as each root folder is treated as a separate project.

* **Cons:**
  - Requires spawning multiple mutation servers for a multi-root workspace, potentially consuming more resources.