import { MutantResult } from '../api/mutant-result';

export interface InitializeParams {
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

/**
 * The capabilities provided by the server.
 * For future compatibility this object can have more properties set than currently defined.
 * Clients receiving this object with unknown properties should ignore these properties. A missing property should be interpreted as an absence of the capability.
 */
export interface ServerCapabilities {
  /**
   * The server provides support for instrument runs.
   */
  instrumentationProvider?: InstrumentationOptions;
  /**
   * The server provides support for mutation test runs.
   */
  mutationTestProvider?: MutationTestOptions;
  [key: string]: any;
}

export interface InitializeResult {
  /**
   * The capabilities the mutation server provides.
   */
  capabilities?: ServerCapabilities;

  /**
   * The server's information.
   */
  serverInfo: {
    /**
     * The server's version as defined by the server.
     */
    version: string;
  };
}

type ProgressToken = number | string;

export interface ProgressParams<T> {
  /**
   * The progress token provided by the client or server.
   */
  token: ProgressToken;
  /**
   * The progress data.
   */
  value: T;
}

interface PartialResultParams {
  /**
   * An optional token that a server can use to report partial results (e.g.
   * streaming) to the client.
   */
  partialResultToken?: ProgressToken;
}

export interface InstrumentParams {
  /**
   * The glob patterns to instrument.
   */
  globPatterns?: string[];
}

export interface MutationTestParams extends PartialResultParams {
  /**
   * The glob patterns to mutation test.
   */
  globPatterns?: string[];
}

export interface MutationTestPartialResult {
  /**
   * The mutant results.
   */
  mutants: MutantResult[];
}

type MethodsType = Record<string, (params?: any) => any>;

export interface MutationServerMethods extends MethodsType {
  instrument(params: InstrumentParams): MutantResult[];
  mutationTest(params: MutationTestParams): MutantResult[];
  initialize(params: InitializeParams): InitializeResult;
}
