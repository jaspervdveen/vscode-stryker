import { MutantResult } from "mutation-testing-report-schema";

export interface DefaultTreeNode {
    name: string;
    children: TreeNode[];
}

export interface FileTreeNode extends DefaultTreeNode {
    mutants: MutantResult[];
    path: string;
}

export type TreeNode = DefaultTreeNode | FileTreeNode;