import { MutationTestResult } from "mutation-testing-report-schema";

export abstract class Platform {
    executable: string;

    constructor(executable: string) {
        this.executable = executable;
    }

    public abstract instrumentationRun(files?: string[]): Promise<MutationTestResult>;
    public abstract mutationTestingRun(files?: string[]): Promise<MutationTestResult>;
}