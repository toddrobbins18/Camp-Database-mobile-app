module.exports = function (api) {
    api.cache(true);

    const plugins = [];
    // Only include reanimated plugin outside of test environment
    // to avoid CJS/ESM conflict with react-native-worklets in Jest
    if (process.env.NODE_ENV !== 'test') {
        plugins.push('react-native-reanimated/plugin');
    }

    return {
        presets: ['babel-preset-expo'],
        plugins,
    };
};
