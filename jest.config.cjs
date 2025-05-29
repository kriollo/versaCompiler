// jest.config.cjs
module.exports = {
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    testMatch: ['**/tests/**/*.test.ts'],
    collectCoverageFrom: ['dist/**/*.ts', '!dist/**/*.d.ts'],
    // Si tienes alias de ruta en tu tsconfig.json (paths), necesitarás configurarlos también para Jest
    // moduleNameMapper: {
    //   '^@components/(.*)$': '<rootDir>/src/components/$1',
    //   '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    //   // Agrega más mapeos según sea necesario
    // },
};
