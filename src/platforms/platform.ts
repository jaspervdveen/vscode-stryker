import { MutationTestResult } from "mutation-testing-report-schema";

export interface Platform {
    instrumentationRun(): Promise<MutationTestResult>;
}

