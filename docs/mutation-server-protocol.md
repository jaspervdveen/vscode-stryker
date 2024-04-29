# Mutation Server Protocol Specification v0.0.1

This document describes the 0.0.1 version of the mutation server protocol.

Table of contents:
1. [Overview](#overview)
2. [Base Protocol](#base-protocol)
3. [Mutation Server Protocol](#mutation-server-protocol)

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
export namespace ErrorCodes {
	// Defined by JSON-RPC
	export const ParseError: number = -32700;
	export const InvalidRequest: number = -32600;
	export const MethodNotFound: number = -32601;
	export const InvalidParams: number = -32602;
	export const InternalError: number = -32603;
}

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
Partial results are also reported using the generic progress notification. The value payload of a partial result progress notification should be the same as the final result. For example the mutate request has MutantResult[] as the result type. Partial result is therefore also of type MutantResult[]. Whether a client accepts partial result notifications for a request is signaled by adding a partialResultToken to the request parameter. For example, a mutate request that supports partial result progress might look like this:

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

Please also note that a response return value of null indicates no result. It doesn’t tell the client to resend the request.

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
* error: code and message set in case an exception happens during the ‘mutate’ request


