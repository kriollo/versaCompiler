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
    // Configuración para manejar módulos ESM
    transformIgnorePatterns: ['node_modules/(?!(chalk|execa)/)'],
    extensionsToTreatAsEsm: ['.ts'],
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
    // Mock para módulos ESM problemáticos
    moduleNameMapper: {
        '^chalk$': '<rootDir>/tests/__mocks__/chalk.js',
        '^execa$': '<rootDir>/tests/__mocks__/execa.js',
    },
};
