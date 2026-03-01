// Global setup that runs BEFORE the test framework is installed
// This fixes Expo SDK 54's __ExpoImportMetaRegistry requirement

if (typeof globalThis.__ExpoImportMetaRegistry === 'undefined') {
    globalThis.__ExpoImportMetaRegistry = {
        register: function () { },
        get: function () { return undefined; },
    };
}
