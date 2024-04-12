import { MutantResult } from "mutation-testing-report-schema";

export interface DefaultTreeNode {
    name: string;
    children: TreeNode[];
}

export interface FileTreeNode extends DefaultTreeNode {
    mutants: MutantResult[];
    relativePath: string; // Relative from the workspace root
}

export type TreeNode = DefaultTreeNode | FileTreeNode;