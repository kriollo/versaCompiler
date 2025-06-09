// jest.config.cjs
export default {
    testEnvironment: 'jsdom',
    testTimeout: 15000, // Incrementar timeout global a 15 segundos
    testMatch: [
        '**/tests/**/*.test.ts',
        '!**/public/**/*',
        '!**/node_modules/**/*',
    ],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: './tsconfig.test.json',
            },
        ],
    },
    moduleFileExtensions: ['ts', 'js', 'json', 'vue'],
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^chalk$': '<rootDir>/tests/__mocks__/chalk.ts',
        '^execa$': '<rootDir>/tests/__mocks__/execa.ts',
        '^@/(.*)$': '<rootDir>/examples/$1',
        '^P@/(.*)$': '<rootDir>/public/$1',
        '^e@/(.*)$': '<rootDir>/examples/$1',
    },
};
