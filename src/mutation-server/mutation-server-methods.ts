import * as schema from 'mutation-testing-report-schema/api';
import { MutantResult } from '../api/mutant-result';

export type MutationServerMethods = {
    instrument(params: { globPatterns?: string[] }): schema.MutationTestResult;
    mutate(params: { globPatterns?: string[] }): MutantResult[];
};