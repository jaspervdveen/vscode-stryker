import { MutantResult } from "./schema";

export interface TestItemNode {
    name: string;
    children: TestItemNode[];
    mutants: MutantResult[];
    fullPath?: string;
}