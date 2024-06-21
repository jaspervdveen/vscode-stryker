# Use Web Sockets for transportation

* Status: accepted
* Deciders: Jasper van der Veen
* Date: 27-05-2024

## Context and Problem Statement
The Mutation Server Protocol standardizes the way IDE extensions and mutation testing frameworks communicate with each other. Mutation servers usually run in a separate process and clients communicate with them in an asynchronous fashion. 

This raises the question of what kind of communication channels (e.g. stdio, pipes, ...) to use, especially considering:
- asynchronous communication
- bi-directional communication between the client and server
- large volumes of messages (e.g. during a test run where partial results are reported)
- large messages (e.g. an entire mutation test report).

## Considered Options

1. stdio: uses standard input/output as the communication channel.
2. pipes: use pipes (Windows) or socket files (Linux, Mac) as the communication channel. The pipe / socket file name is passed via the process argument.
3. socket: uses a raw socket as the communication channel.
4. http: Uses HTTP for communication.
5. web sockets: Uses WebSockets for communication. WebSocket is not HTTP, but it does use HTTP initially for its handshake process.

<!-- Is it a correct assumption that Server Sent Events (SSE) was not considered? Why not? It would simplify the server implementation (SSE is much simpler). Bi-directional communication could be established via multiple HTTP requests. -->

## Decision Outcome
Initially, web sockets will be used for communication. However, future plans include supporting communication via pipes, sockets, and HTTP to ensure flexibility and compatibility across various environments.

## Decision Rationale 
WebSockets were chosen for the Mutation Server Protocol for the following reasons:

- Message-based protocol: WebSockets facilitate non-polluted communication over a message-based protocol, simplifying implementation and avoiding message fragmentation issues for larger payloads.
- Efficiency: Unlike HTTP, which incurs overhead with each message due to headers, WebSockets provide a low-latency, full-duplex channel suitable for real-time interactions and frequent message exchanges.

All the communication forms mentioned are suitable for facilitating communication between IDE extensions and mutation testing frameworks in the Mutation Server Protocol. The decision to choose one over the other depends on factors such as performance, ease of implementation, and compatibility with existing systems.

## Pros and Cons of the Options

# stdio

* **Pros:**
  - Simple implementation.

* **Cons:**
  - Stream-oriented, which may not be optimal for handling large message sizes without fragmentation.
  - Within the mutation server, Stryker runs are started which print to the standard output. So this pollutes the output.

# pipes

* **Pros:**
  - Simple implementation.

* **Cons:**
  - Stream-oriented, which may not be optimal for handling large message sizes without fragmentation.
  - Platform-dependent (pipes for Windows, socket files for Linux/Mac).

# socket

* **Pros:**
  - Suitable for both asynchronous and bi-directional communication.
  - Can be used for both local and network communication.

* **Cons:**
  - Requires more manual handling for message framing and protocol implementation compared to higher-level protocols like WebSockets.

# http

* **Pros:**
  - Universally supported and well-understood protocol.

* **Cons:**
  - Limited support for bi-directional communication
  - Even with persistent connections since HTTP/1.1, each message involves HTTP headers, which add overhead.

# web sockets

* **Pros:**
  - Designed specifically for real-time, bidirectional communication between client and server.
  - Low-latency, once the initial connection is established, there's very little overhead for subsequent messages.
  
* **Cons:**
  - Requires WebSocket support in the client and server environments.
  - More overhead compared to raw sockets due to protocol framing.