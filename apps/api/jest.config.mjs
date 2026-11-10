export default {
  displayName: 'api',
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@ecommerce/shared$': '<rootDir>/../../packages/shared/dist/index.js',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};
