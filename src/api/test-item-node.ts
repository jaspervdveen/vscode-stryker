import { MutantResult } from "mutation-testing-report-schema";

export interface TestItemNode {
    name: string;
    children: TestItemNode[];
    mutants: MutantResult[];
    fullPath?: string;
}