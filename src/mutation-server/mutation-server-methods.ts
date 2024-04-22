import { MutantResult } from '../api/mutant-result';

export type MutationServerMethods = {
    instrument(params: { globPatterns?: string[] }): MutantResult[];
    mutate(params: { globPatterns?: string[] }): MutantResult[];
};