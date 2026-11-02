module.exports = {
  preset: 'ts-jest',
  moduleNameMapper: { '^@fullstackcraftllc/growthkit$': '<rootDir>/src/index.ts' },
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts']
};
