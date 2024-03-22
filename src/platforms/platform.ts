import { MutationTestResult } from "../api/schema.js";

export interface Platform {
    instrumentationRun(): Promise<MutationTestResult>;
}

