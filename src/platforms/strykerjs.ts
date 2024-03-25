import { Platform } from "./platform.js";
import { MutationTestResult } from "mutation-testing-report-schema";

export class StrykerJs extends Platform {

    constructor() {
        // temp path to the unpublished stryker executable while in development
        // TODO: Make this configurable/autodetect
        super('/home/jasper/repos/stryker-js/packages/core/bin/stryker.js');
    }

    async instrumentationRun(): Promise<MutationTestResult> {
        let args: string[] = ['run', '--checkers ""', '--buildCommand ""', '--plugins ""', '--testRunner ""', '--logLevel off', '--reporters json'];

        return super.instrumentationRun(args);
    }
}