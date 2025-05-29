// jest.config.cjs
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    verbose: true,
    collectCoverageFrom: ['dist/**/*.ts', '!dist/**/*.d.ts'],
};
