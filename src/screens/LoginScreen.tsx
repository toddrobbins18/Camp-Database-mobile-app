import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';

interface LoginScreenProps {
    navigation: any;
}

export const LoginScreen = ({ navigation }: LoginScreenProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignIn = () => {
        // TODO: Implement authentication logic
        // For now, navigate to main app
        navigation.replace('MainApp');
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                        {/* Header */}
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to manage The Nest</Text>

                        {/* Form */}
                        <View style={styles.form}>
                            {/* Email Input */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Email address</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your email address"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Your Password</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your password"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            {/* Sign In Button */}
                            <TouchableOpacity
                                style={styles.signInButton}
                                onPress={handleSignIn}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.signInButtonText}>Sign in</Text>
                            </TouchableOpacity>

                            {/* Links */}
                            <TouchableOpacity
                                style={styles.linkContainer}
                                onPress={() => {
                                    // TODO: Implement forgot password
                                }}
                            >
                                <Text style={styles.linkText}>Forgot your password?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.linkContainer}
                                onPress={() => navigation.navigate('SignUp')}
                            >
                                <Text style={styles.linkText}>
                                    Don't have an account? Sign up
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: theme.spacing.xl,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        textAlign: 'center',
    },
    form: {
        width: '100%',
        maxWidth: 400,
    },
    inputContainer: {
        marginBottom: theme.spacing.lg,
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        fontSize: 16,
        color: theme.colors.text,
        outlineWidth: 0,
        outlineColor: 'transparent',
    },
    signInButton: {
        width: '100%',
        height: 50,
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    signInButtonText: {
        color: theme.colors.surface,
        fontSize: 16,
        fontWeight: '600',
    },
    linkContainer: {
        marginTop: theme.spacing.md,
        alignItems: 'center',
    },
    linkText: {
        fontSize: 14,
        color: theme.colors.secondary,
        textAlign: 'center',
    },
});
