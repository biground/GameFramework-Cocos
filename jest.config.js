module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@framework/(.*)$': '<rootDir>/assets/scripts/framework/$1',
    '^@runtime/(.*)$': '<rootDir>/assets/scripts/runtime/$1',
    '^@game/(.*)$': '<rootDir>/assets/scripts/game/$1',
    '^@utils/(.*)$': '<rootDir>/assets/scripts/utils/$1',
  },
  collectCoverageFrom: [
    'assets/scripts/framework/**/*.ts',
    '!assets/scripts/framework/**/*.d.ts',
  ],
};
