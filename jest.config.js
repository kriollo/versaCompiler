// jest.config.cjs
export default {
    testEnvironment: 'jsdom',
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
