import * as schema from 'mutation-testing-report-schema/api';

export interface Mutant {
    /**
    * The file name from which this mutant originated
    */
    fileName: string;
    /**
     * Actual mutation that has been applied.
     */
    replacement: string;
    /**
     * The status of a mutant if known. This should be undefined for a mutant that still needs testing.
     */
    status?: schema.MutantStatus;
}

// Added these types here as they are used by StrykerJS but not defined in the schema
export type MutantResult = Mutant & schema.MutantResult;