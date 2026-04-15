module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    globals: {
        GFC_DEBUG: true,
    },
    roots: ['<rootDir>/tests', '<rootDir>/packages'],
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
    // CI 环境输出 JUnit XML，本地调试时仅用默认 reporter
    reporters: process.env.CI
        ? ['default', ['jest-junit', { outputDirectory: '.', outputName: 'junit.xml' }]]
        : ['default'],
};
