// Jest setup file — runs after test framework is installed
// Module mocks are handled via moduleNameMapper in jest.config.js

// Silence console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
    if (
        typeof args[0] === 'string' &&
        (args[0].includes('Animated: `useNativeDriver`') ||
            args[0].includes('componentWillReceiveProps'))
    ) {
        return;
    }
    originalWarn.call(console, ...args);
};
