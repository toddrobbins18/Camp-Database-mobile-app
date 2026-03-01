// Mock for react-native-safe-area-context
const React = require('react');

const SafeAreaProvider = ({ children }) => React.createElement('SafeAreaProvider', null, children);
const SafeAreaView = ({ children }) => React.createElement('SafeAreaView', null, children);
const useSafeAreaInsets = () => ({ top: 0, right: 0, bottom: 0, left: 0 });

module.exports = {
    SafeAreaProvider,
    SafeAreaView,
    useSafeAreaInsets,
};
