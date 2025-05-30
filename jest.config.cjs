// jest.config.cjs
module.exports = {
    testEnvironment: 'jsdom',
    testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.ts'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: 'tsconfig.test.json',
            },
        ],
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    verbose: true,
    collectCoverageFrom: [
        'src/**/*.ts',
        'src/**/*.js',
        '!src/**/*.d.ts',
        '!src/js/examples/**',
        '!src/**/__mocks__/**',
    ],
    coverageReporters: ['text', 'html', 'json-summary'],
    // Configuración para manejar módulos ESM
    transformIgnorePatterns: ['node_modules/(?!(chalk|execa)/)'],
    extensionsToTreatAsEsm: ['.ts'], // Mock para módulos ESM problemáticos
    moduleNameMapper: {
        '^chalk$': '<rootDir>/tests/__mocks__/chalk.ts',
        '^execa$': '<rootDir>/tests/__mocks__/execa.ts',
    },
};
