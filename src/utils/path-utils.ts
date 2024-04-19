import { minimatch } from 'minimatch';

export const pathUtils = {
  filterCoveredPatterns(globPatterns: string[]): string[] {
    return globPatterns.filter((globPattern, index) => {
      return !globPatterns.some((otherGlobPattern, otherIndex) => otherIndex !== index && minimatch(globPattern, otherGlobPattern));
    });
  },
};
