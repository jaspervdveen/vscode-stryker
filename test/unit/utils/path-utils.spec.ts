import { assert } from 'chai';
import { describe, it } from 'mocha';

import { pathUtils } from '../../../src/utils/path-utils';

describe('pathUtils', () => {
  describe('filterCoveredPatterns', () => {
    it('should filter out covered glob patterns', () => {
      const globPatterns: string[] = ['src/**/*.ts', 'src/index.ts', 'src/app.ts', 'src/components/**/*.ts', 'dist/**/*.js'];
      const filteredPatterns = pathUtils.filterCoveredPatterns(globPatterns);
      const expectedResults: string[] = ['src/**/*.ts', 'dist/**/*.js'];
      assert.deepEqual(filteredPatterns, expectedResults);
    });

    it('should return empty array if no glob patterns are provided', () => {
      const globPatterns: string[] = [];
      const filteredPatterns = pathUtils.filterCoveredPatterns(globPatterns);
      assert.deepEqual(filteredPatterns, []);
    });

    it('should return the same array if all patterns are unique', () => {
      const globPatterns = ['*.txt', 'src/*.js', '**/*.json'];
      const filteredPatterns = pathUtils.filterCoveredPatterns(globPatterns);
      assert.deepEqual(filteredPatterns, globPatterns);
    });

    it('should handle a single pattern array', () => {
      const globPatterns = ['*.txt'];
      const filteredPatterns = pathUtils.filterCoveredPatterns(globPatterns);
      assert.deepEqual(filteredPatterns, globPatterns);
    });
  });
});
