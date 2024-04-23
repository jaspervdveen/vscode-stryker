import { assert } from 'chai';

import { pathUtils } from '../../../src/utils/path-utils';

suite('pathUtils', () => {
  suite('filterCoveredPatterns', () => {
    test('should filter out covered glob patterns', () => {
      const globPatterns: string[] = ['src/**/*.ts', 'src/index.ts', 'src/app.ts', 'src/components/**/*.ts', 'dist/**/*.js'];
      const filteredPatterns = pathUtils.filterCoveredPatterns(globPatterns);
      const expectedResults: string[] = ['src/**/*.ts', 'dist/**/*.js'];
      assert.deepEqual(filteredPatterns, expectedResults);
    });

    test('should return empty array if no glob patterns are provided', () => {
      const globPatterns: string[] = [];
      const filteredPatterns = pathUtils.filterCoveredPatterns(globPatterns);
      assert.deepEqual(filteredPatterns, []);
    });

    test('should return the same array if all patterns are unique', () => {
      const globPatterns = ['*.txt', 'src/*.js', '**/*.json'];
      const filteredPatterns = pathUtils.filterCoveredPatterns(globPatterns);
      assert.deepEqual(filteredPatterns, globPatterns);
    });

    test('should handle a single pattern array', () => {
      const globPatterns = ['*.txt'];
      const filteredPatterns = pathUtils.filterCoveredPatterns(globPatterns);
      assert.deepEqual(filteredPatterns, globPatterns);
    });
  });
});
