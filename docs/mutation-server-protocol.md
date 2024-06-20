# Mutation Server Protocol Specification v0.0.1-alpha.1

This document describes the 0.0.1-alpha.1 version of the mutation server protocol.

Table of contents:
- [Overview](#overview)
- [Base Protocol](#base-protocol)
    - [Abstract Message](#abstract-message)
    - [Request Message](#request-message)
    - [Response Message](#response-message)
    - [Notification Message](#notification-message)
    - [\$ Notifications and requests](#$-notifications-and-requests)
    - [Cancellation Support](#cancellation-support)
    - [Progress Support](#progress-support)
        - [Partial Result Progress](#partial-result-progress)
        - [Partial Result Params](#partialresultparams)
- [Lifecycle Messages](#server-lifecycle)
    - [Initialize Request](#initialize-request)
        - [Server Capabilities](#server-capabilities)
        - [Version Handshake](#version-handshake)
- [Mutation Server Protocol](#mutation-server-protocol)
    - [Features](#features)
        - [Mutation test run](#mutation-test-run)
        - [Instrument run](#instrument-run)

## Overview
The idea behind a *Mutation Server* is to provide mutation-specific smarts inside a server that can communicate with development tooling (such as an IDE) over a protocol that enables inter-process communication.

The idea behind the *Mutation Server Protocol* is to standardize the protocol for how tools and servers communicate, so a single *Mutation Server* can be re-used in multiple development tools, and tools can support mutation testing frameworks with minimal effort. A mutation server runs as a separate process and development tools communicate with the server using the mutation server protocol over JSON-RPC.

The *Mutation Server Protocol* is inspired by the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)

## Base Protocol

The base protocol sends JSON-RPC 2.0 messages using HTTP transport protocol. 

### Abstract Message
A general message as defined by JSON-RPC. The mutation server protocol always uses “2.0” as the jsonrpc version.

```typescript
interface Message {
    jsonrpc: string;
}
```

### Request Message
A request message to describe a request between the client and the server. Every processed request must send a response back to the sender of the request.


```typescript
interface RequestMessage extends Message {
	/**
	 * The request id.
	 */
	id: number | string;

	/**
	 * The method to be invoked.
	 */
	method: string;

	/**
	 * The method's params.
	 */
	params?: array | object;
}
```

### Response Message
A Response Message sent as a result of a request.

```typescript
interface ResponseMessage extends Message {
	/**
	 * The request id.
	 */
	id: number | string | null;

	/**
	 * The result of a request. This member is REQUIRED on success.
	 * This member MUST NOT exist if there was an error invoking the method.
	 */
	result?: string | number | boolean | array | object | null;

	/**
	 * The error object in case a request fails.
	 */
	error?: ResponseError;
}
```

```typescript
interface ResponseError {
	/**
	 * A number indicating the error type that occurred.
	 */
	code: number;

	/**
	 * A string providing a short description of the error.
	 */
	message: string;

	/**
	 * A primitive or structured value that contains additional
	 * information about the error. Can be omitted.
	 */
	data?: string | number | boolean | array | object | null;
}
```

```typescript
export const ErrorCodes = {
  // Defined by JSON-RPC
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,

  /**
   * The client has canceled a request and a server has detected
   * the cancel.
   */
  RequestCancelled: -32000,

  /**
   * Error code indicating that a server received a notification or
   * request before the server has received the `initialize` request.
   */
  ServerNotInitialized: -32001;

  /**
   * If the protocol version provided by the client can't be handled by
   * the server.
   */
  UnknownProtocolVersion: -5000;
};

```

### Notification message
A notification message. A processed notification message must not send a response back. They work like events.


```typescript
interface NotificationMessage extends Message {
	/**
	 * The method to be invoked.
	 */
	method: string;

	/**
	 * The notification's params.
	 */
	params?: array | object;
}
```

### \$ Notifications and requests
Notification and requests whose methods start with '\$/ are messages which are protocol implementation dependent and might not be implementable in all clients or servers. For example if the server implementation uses a single threaded synchronous programming language then there is little a server can do to react to a [$/cancelRequest notification](#cancellation-support). If a server or client receives notifications starting with '\$/' it is free to ignore the notification. If a server or client receives a request starting with '\$/' it must error the request with a [MethodNotFound error](#response-message) if the request will not be handled.

### Cancellation Support
The base protocol offers support for request cancellation. To cancel a request, a notification message with the following properties is sent:

*Notification:*

* method '$/cancelRequest'
* params: `CancelParams` defined as follows:

```typescript
export interface CancelParams {
  /**
   * The request id to cancel.
   */
  id: number | string;
}
```

A request that got canceled still needs to return from the server and send a response back. It can not be left open / hanging. This is in line with the JSON-RPC protocol that requires that every request sends a response back.

If the request returns an error response on cancellation the error code should be set to [ErrorCodes.RequestCancelled](#response-message).

### Progress Support
The base protocol offers support to report progress in a generic fashion. This mechanism can be used to report partial result progress to support streaming of results.

A progress notification has the following properties:

*Notification:*

* method: ‘progress’
* params: `ProgressParams` defined as follows:

```typescript
type ProgressToken = number | string;
```
```typescript
interface ProgressParams<T> {
	/**
	 * The progress token provided by the client or server.
	 */
	token: ProgressToken;

	/**
	 * The progress data.
	 */
	value: T;
}
```
Progress is reported against a token. The token is different than the request ID which allows to report progress out of band and also for notification.

#### Partial Result Progress
Partial results are also reported using the generic progress notification. The value payload of a partial result progress notification should be the same as the final result. For example the mutate request has `MutantResult[]` as the result type. Partial result is therefore also of type `MutantResult[]`. Whether a client accepts partial result notifications for a request is signaled by adding a partialResultToken to the request parameter. For example, a mutate request that supports partial result progress might look like this:

```json
{
	"globPatterns": [
        "foo/bar/**",
        "bar.ts",
    ],
	// The token used to report partial result progress.
	"partialResultToken": "5f6f349e-4f81-4a3b-afff-ee04bff96804"
}
```

The `partialResultToken` is then used to report partial results for the find references request.

If a server reports partial result via a corresponding `progress`, the whole result must be reported using `progress` notifications. Each `progress` notification appends items to the result. The final response has to be empty in terms of result values. This avoids confusion about how the final result should be interpreted, e.g. as another partial result or as a replacing result.

The token received via the partialResultToken property in a request’s param literal is only valid as long as the request has not send a response back. Canceling partial results is done by simply canceling the corresponding request.

To ensure that clients do not set up a handler for partial results when the server does not support reporting any progress, the server must indicate its support for partial results reporting in its [capabilities](#server-capabilities). For example, in case the server can send partial results during a mutation test run, a server would signal such a support by setting the `mutationTestProvider` property in the server capabilities as follows:

```json
{
	"mutationTestProvider": {
		"partialResults": true
	}
}
```

The corresponding type definition for the server capability looks like this:
```typescript
export interface PartialResultOptions {
  partialResults?: boolean;
}
```

#### PartialResultParams
A parameter literal used to pass a partial result token.
```typescript

export interface PartialResultParams {
	/**
	 * An optional token that a server can use to report partial results (e.g.
	 * streaming) to the client.
	 */
	partialResultToken?: ProgressToken;
}
```

## Server lifecycle
The current protocol specification defines that the lifecycle of a server is managed by the client (e.g. a tool like VS Code). It is up to the client to decide when to start and when to shutdown a server.

## Initialize Request
The initialize request is sent as the first request from the client to the server. If the server receives a request or notification before the initialize request it should act as follows:

- For a request the response should be an error message with code: -32001. 
- Notifications should be dropped.

Until the server has responded to the initialize request with an `InitializeResult`, the client must not send any additional requests or notifications to the server. In addition the server is not allowed to send any requests or notifications to the client until it has responded with an `InitializeResult`.

The initialize request may only be sent once.

Request:
* method: 'initialize'
* params: `InitializeParams` defined as follows:
```typescript
interface InitializeParams {
  /**
   * Information about the client.
   */
  clientInfo: {
    /**
     * The client's version as defined by the client.
     */
    version: string;
  };

  /**
   * The URI of the mutation testing framework config file
   */
  configUri?: string;
}
```

Response:
* result: `InitializeResult` defined as follows:
```typescript
interface InitializeResult {
  /**
   * The server's information.
   */
  serverInfo: {
    /**
     * The server's version as defined by the server.
     */
    version: string;
  };

  /**
   * The capabilities the mutation server provides.
   */
  capabilities?: ServerCapabilities;
}
```
* error: Server can throw an [UnknownProtocolVersion](#response-message) error code if the protocol version provided by the client can't be handled by the server.

### Server Capabilities

Mutation servers may not support all features defined by the protocol. The protocol therefore provides ‘capabilities’ within the initialization handshake. A capability groups a set of features. A mutation server announces their supported features using capabilities. As an example, a server announces that it cannot handle the `instrument` request.

```typescript
/**
 * The capabilities provided by the server.
 */
interface ServerCapabilities {
  /**
   * The server provides support for instrument runs.
   */
  instrumentationProvider?: InstrumentationOptions;
  /**
   * The server provides support for mutation test runs.
   */
  mutationTestProvider?: MutationTestOptions;
}
```

```typescript
export interface PartialResultOptions {
  /**
   * The server supports returning partial results.
   */
  partialResults?: boolean;
}

/**
 * The options for instrumentation provider.
 */
type InstrumentationOptions = PartialResultOptions;

/**
 * The options for mutation testing provider.
 */
type MutationTestOptions = PartialResultOptions;
```

For future compatibility a `ServerCapabilities` object literal can have more properties set than currently defined. Clients receiving a ServerCapabilities object literal with unknown properties should ignore these properties. A missing property should be interpreted as an absence of the capability.

### Version handshake
The protocol also uses versioning to manage changes. Both the client and the server negotiate the version they support within the initialization handshake. The version handshake uses [semantic versioning 2.0.0](https://semver.org/) to manage compatibility. For example, if both versions share the same major version (1.x.x), they are considered compatible. If the major versions differ, the server must adjust or notify the user of the incompatibility by responding with an `UnknownProtocolVersion` error to an initialization request.

## Mutation Server Protocol
The language server protocol defines a set of JSON-RPC request, response and notification messages which are exchanged using the above base protocol. This section starts describing the basic JSON structures used in the protocol. The document uses TypeScript interfaces to describe these. Based on the basic JSON structures, the actual requests with their responses and the notifications are described.

An example would be a request send from the client to the server to request a mutation test run for specific glob patterns. The request's method would be 'mutate' with a parameter like this:

```typescript
interface MutateParams extends PartialResultParams {
  /**
   * The glob patterns to mutate.
   */
  globPatterns?: string[];
}
```

The result of the request would be an array of mutants which have been tested. So the result looks like this:
```typescript
interface MutateResult {
	value: MutantResult[];
}
```

Please also note that a response return value of null indicates no result. It doesn't tell the client to resend the request.

### Features

#### Mutation test run
The request is sent from the client to the server to start a mutation run for the given glob patterns.

Request:
* method: 'mutate'
* params: `MutateParams` defined as follows:

```typescript
interface MutateParams extends PartialResultParams {
  /**
   * The glob patterns to mutate.
   */
  globPatterns?: string[];
}
```

Response:
* result: `MutantResult[]` defined as follows:
<a id="mutantresult"></a>

```typescript
/**
 * Single mutation.
 */
interface MutantResult {

    /**
     * The test ids that covered this mutant. If a mutation testing framework doesn't measure this information, it can simply be left out.
     */
    coveredBy?: string[];

    /**
     * Description of the applied mutation.
     */
    description?: string;

    /**
     * The net time it took to test this mutant in milliseconds. This is the time measurement without overhead from the mutation testing framework.
     */
    duration?: number;

    /**
     * The file name from which this mutant originated
     */
    fileName: string;

    /**
     * Unique id, can be used to correlate this mutant across reports.
     */
    id: string;

    /**
     * The test ids that killed this mutant. It is a best practice to "bail" on first failing test, in which case you can fill this array with that one test.
     */
    killedBy?: string[];

    /**
     * The location of the mutant in the source code.
     */
    location: Location;

    /**
     * Category of the mutation.
     */
    mutatorName: string;

    /**
     * Actual mutation that has been applied.
     */
    replacement: string;

    /**
     * A static mutant means that it was loaded once at during initialization, this makes it slow or even impossible to test, depending on the mutation testing framework.
     */
    static?: boolean;

    /**
     * The status of a mutant.
     */
    status: MutantStatus;

    /**
     * The reason that this mutant has this status. In the case of a killed mutant, this should be filled with the failure message(s) of the failing tests. In case of an error mutant, this should be filled with the error message.
     */
    statusReason?: string;

    /**
     * The number of tests actually completed in order to test this mutant. Can differ from "coveredBy" because of bailing a mutant test run after first failing test.
     */
    testsCompleted?: number;
}

/**
 * Result of the mutation.
 */
type MutantStatus = "Killed" | "Survived" | "NoCoverage" | "CompileError" | "RuntimeError" | "Timeout" | "Ignored" | "Pending";

/**
 * A location with start and end. Start is inclusive, end is exclusive.
 */
interface Location {
    start: Position;
    end: Position;
}

/**
 * Position of a mutation. Both line and column start at one.
 */
interface Position {
    line: number;
    column: number;
}
```

* partial result: [`MutantResult[]`](#mutantresult)
* error: code and message set in case an exception happens during the ‘mutate’ request

### Instrument run
The request is sent from the client to the server to request mutations for the given glob patterns.

Request:
* method: 'instrument'
* params: `InstrumentParams` defined as follows:
```typescript
export interface InstrumentParams {
  /**
   * The glob patterns to instrument.
   */
  globPatterns?: string[];
}
```
Response:
* result: [`MutantResult[]`](#mutantresult).
* error: code and message set in case an exception happens during the 'instrument' request