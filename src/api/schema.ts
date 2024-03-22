// const MutationTestResult = import("mutation-testing-report-schema");
// export type MutationTestResult = typeof MutationTestResult;

// TODO: Change as this is a temp fix for vs code extension not recognizing mutation-testing-report-schema

/**
 * Result of the mutation.
 */
export type MutantStatus = "Killed" | "Survived" | "NoCoverage" | "CompileError" | "RuntimeError" | "Timeout" | "Ignored" | "Pending";
/**
 * Schema for a mutation testing report.
 */
export interface MutationTestResult {
    /**
     * Free-format object that represents the configuration used to run mutation testing.
     */
    config?: {};
    /**
     * Major version of this report. Used for compatibility.
     */
    schemaVersion: string;
    files: FileResultDictionary;
    testFiles?: TestFileDefinitionDictionary;
    thresholds: Thresholds;
    /**
     * The optional location of the project root.
     */
    projectRoot?: string;
    performance?: PerformanceStatistics;
    framework?: FrameworkInformation;
    system?: SystemInformation;
}
/**
 * All mutated files.
 */
export interface FileResultDictionary {
    [k: string]: FileResult; // example: "src/services/myService.js"
}
/**
 * Mutated file, with the relative path of the file as the key.
 */
export interface FileResult {
    /**
     * Programming language that is used. Used for code highlighting, see https://prismjs.com/#examples.
     */
    language: string;
    mutants: MutantResult[];
    /**
     * Full source code of the original file (without mutants), this is used to display exactly what was changed for each mutant.
     */
    source: string;
}
/**
 * Single mutation.
 */
export interface MutantResult {
    /**
     * The test ids that covered this mutant. If a mutation testing framework doesn't measure this information, it can simply be left out.
     */
    coveredBy?: string[];
    /**
     * Description of the applied mutation.
     */
    description?: string;
    /**
     * The net time it took to test this mutant in milliseconds. This is the time measurement without overhead from the mutation testing framework.
     */
    duration?: number;
    /**
     * Unique id, can be used to correlate this mutant across reports.
     */
    id: string;
    /**
     * The test ids that killed this mutant. It is a best practice to "bail" on first failing test, in which case you can fill this array with that one test.
     */
    killedBy?: string[];
    location: Location;
    /**
     * Category of the mutation.
     */
    mutatorName: string;
    /**
     * Actual mutation that has been applied.
     */
    replacement?: string;
    /**
     * A static mutant means that it was loaded once at during initialization, this makes it slow or even impossible to test, depending on the mutation testing framework.
     */
    static?: boolean;
    status: MutantStatus;
    /**
     * The reason that this mutant has this status. In the case of a killed mutant, this should be filled with the failure message(s) of the failing tests. In case of an error mutant, this should be filled with the error message.
     */
    statusReason?: string;
    /**
     * The number of tests actually completed in order to test this mutant. Can differ from "coveredBy" because of bailing a mutant test run after first failing test.
     */
    testsCompleted?: number;
}
/**
 * A location with start and end. Start is inclusive, end is exclusive.
 */
export interface Location {
    start: Position;
    end: Position;
}
/**
 * Position of a mutation. Both line and column start at one.
 */
export interface Position {
    line: number;
    column: number;
}
/**
 * Test file definitions by file path OR class name.
 */
export interface TestFileDefinitionDictionary {
    [k: string]: TestFile;
}
/**
 * A file containing one or more tests
 */
export interface TestFile {
    /**
     * Full source code of the test file, this can be used to display in the report.
     */
    source?: string;
    tests: TestDefinition[];
}
/**
 * A test in your test file.
 */
export interface TestDefinition {
    /**
     * Unique id of the test, used to correlate what test killed a mutant.
     */
    id: string;
    /**
     * Name of the test, used to display the test.
     */
    name: string;
    location?: OpenEndLocation;
}
/**
 * A location where "end" is not required. Start is inclusive, end is exclusive.
 */
export interface OpenEndLocation {
    start: Position;
    end?: Position;
}
/**
 * Thresholds for the status of the reported application.
 */
export interface Thresholds {
    /**
     * Higher bound threshold.
     */
    high: number;
    /**
     * Lower bound threshold.
     */
    low: number;
}
/**
 * The performance statistics per phase. Total time should be roughly equal to the sum of all these.
 */
export interface PerformanceStatistics {
    /**
     * Time it took to run the setup phase in milliseconds.
     */
    setup: number;
    /**
     * Time it took to run the initial test phase (dry-run) in milliseconds.
     */
    initialRun: number;
    /**
     * Time it took to run the mutation test phase in milliseconds.
     */
    mutation: number;
}
/**
 * Extra information about the framework used
 */
export interface FrameworkInformation {
    /**
     * Name of the framework used.
     */
    name: string;
    /**
     * Version of the framework.
     */
    version?: string;
    branding?: BrandingInformation;
    dependencies?: Dependencies;
}
/**
 * Extra branding information about the framework used.
 */
export interface BrandingInformation {
    /**
     * URL to the homepage of the framework.
     */
    homepageUrl: string;
    /**
     * URL to an image for the framework, can be a data URL.
     */
    imageUrl?: string;
}
/**
 * Dependencies used by the framework. Key-value pair of dependencies and their versions.
 */
export interface Dependencies {
    [k: string]: string;
}
/**
 * Information about the system that performed mutation testing.
 */
export interface SystemInformation {
    /**
     * Did mutation testing run in a Continuous Integration environment (pipeline)? Note that there is no way of knowing this for sure. It's done on a best-effort basis.
     */
    ci: boolean;
    os?: OSInformation;
    cpu?: CpuInformation;
    ram?: RamInformation;
}
export interface OSInformation {
    /**
     * Human-readable description of the OS
     */
    description?: string;
    /**
     * Platform identifier
     */
    platform: string;
    /**
     * Version of the OS or distribution
     */
    version?: string;
}
export interface CpuInformation {
    /**
     * Clock speed in MHz
     */
    baseClock?: number;
    logicalCores: number;
    model?: string;
}
export interface RamInformation {
    /**
     * The total RAM of the system that performed mutation testing in MB.
     */
    total: number;
}
//# sourceMappingURL=schema.d.ts.map