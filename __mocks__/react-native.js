// Minimal React Native mock for Jest
const React = require('react');

const createMockComponent = (name) => {
    const Component = (props) => React.createElement(name, props, props.children);
    Component.displayName = name;
    return Component;
};

module.exports = {
    // Components
    View: createMockComponent('View'),
    Text: createMockComponent('Text'),
    TextInput: createMockComponent('TextInput'),
    TouchableOpacity: createMockComponent('TouchableOpacity'),
    ScrollView: createMockComponent('ScrollView'),
    Modal: createMockComponent('Modal'),
    Switch: createMockComponent('Switch'),
    Pressable: createMockComponent('Pressable'),
    Alert: {
        alert: jest.fn(),
    },
    StyleSheet: {
        create: (styles) => styles,
        flatten: (style) => style,
    },
    Platform: {
        OS: 'ios',
        select: (obj) => obj.ios || obj.default,
    },
    Dimensions: {
        get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
    },
    Animated: {
        View: createMockComponent('Animated.View'),
        Text: createMockComponent('Animated.Text'),
        Value: jest.fn(() => ({
            interpolate: jest.fn(),
            setValue: jest.fn(),
        })),
        timing: jest.fn(() => ({ start: jest.fn() })),
        spring: jest.fn(() => ({ start: jest.fn() })),
    },
};
