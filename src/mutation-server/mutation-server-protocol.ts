import { MutantResult } from '../api/mutant-result';

export interface InitializeParams {
  /**
   * The URI of the mutation testing framework config file
   */
  configUri?: string;
}

const InitializeResult = {};

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

export interface MutateParams extends PartialResultParams {
  /**
   * The glob patterns to mutate.
   */
  globPatterns?: string[];
}

export interface MutatePartialResult {
  /**
   * The mutant results.
   */
  mutants: MutantResult[];
}

type MethodsType = Record<string, (params?: any) => any>;

export interface MutationServerMethods extends MethodsType {
  instrument(params: InstrumentParams): MutantResult[];
  mutate(params: MutateParams): MutantResult[];
  initialize(params: InitializeParams): typeof InitializeResult;
}
