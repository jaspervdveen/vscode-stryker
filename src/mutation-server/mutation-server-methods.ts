import { MutantResult } from '../api/mutant-result';

export type ProgressToken = number | string;

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

export interface PartialResultParams {
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

export type MutationServerMethods = {
    instrument(params: InstrumentParams): MutantResult[];
    mutate(params: MutateParams): MutantResult[];
};

export type MutationServerMethodParams<T extends keyof MutationServerMethods> = Parameters<MutationServerMethods[T]>;