import { MutationTestResult } from "mutation-testing-report-schema";

export interface Platform {
    instrumentationRun(globPatterns?: string[]): Promise<MutationTestResult>;
    mutationTestingRun(globPatterns?: string[]): Promise<MutationTestResult>;
}