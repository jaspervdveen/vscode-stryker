import { MutationTestResult } from "mutation-testing-report-schema";

export type MutationServerMethods = {
    instrument(params: { globPatterns?: string[] }): MutationTestResult;
    mutate(params: { globPatterns?: string[] }): MutationTestResult;
};