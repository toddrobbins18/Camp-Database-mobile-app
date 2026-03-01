/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
    setupFilesAfterEnv: ['./jest.setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^react-native$': '<rootDir>/__mocks__/react-native.js',
        '^react-native-url-polyfill/auto$': '<rootDir>/__mocks__/empty.js',
        '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.js',
        '^react-native-keyboard-aware-scroll-view$': '<rootDir>/__mocks__/empty.js',
        '^react-native-safe-area-context$': '<rootDir>/__mocks__/react-native-safe-area-context.js',
        '^@expo/vector-icons$': '<rootDir>/__mocks__/empty.js',
        '^expo-status-bar$': '<rootDir>/__mocks__/empty.js',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                jsx: 'react-jsx',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
            },
        }],
    },
};
