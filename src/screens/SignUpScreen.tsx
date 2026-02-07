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
    Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import { useRegister } from '../hooks/useAuth';
import { registerSchema } from '../lib/authSchemas';

interface SignUpScreenProps {
    navigation: any;
}

export const SignUpScreen = ({ navigation }: SignUpScreenProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');


    const { mutate: register, isPending } = useRegister(
        () => {
            navigation.navigate('Login');
        },
        (err) => {
            if (err.message?.toLowerCase().includes('already registered')) {
                setError('User already registered');
            } else {
                setError(err.message || 'Registration failed');
            }
        }
    );

    const handleSignUp = () => {
        setError('');

        if (password.length < 6) {
            Alert.alert("Invalid Password", "The password must contain 6 characters or more");
            return;
        }

        const result = registerSchema.safeParse({
            email,
            password,
            full_name: email.split('@')[0] // Use email prefix as default name since field is removed
        });

        if (!result.success) {
            Alert.alert("Validation Error", result.error.issues[0].message);
            return;
        }

        register({ email, password, full_name: email.split('@')[0] });
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
                        {/* Header matching image exactly */}
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
                                <Text style={styles.label}>Create a Password</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Create a password"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            {/* Sign Up Button */}
                            <TouchableOpacity
                                style={[styles.signUpButton, isPending && { opacity: 0.7 }]}
                                onPress={handleSignUp}
                                activeOpacity={0.8}
                                disabled={isPending}
                            >
                                <Text style={styles.signUpButtonText}>
                                    {isPending ? 'Signing up...' : 'Sign up'}
                                </Text>
                            </TouchableOpacity>

                            {/* Link */}
                            <TouchableOpacity
                                style={styles.linkContainer}
                                onPress={() => navigation.navigate('Login')}
                            >
                                <Text style={styles.linkText}>
                                    Already have an account? Sign in
                                </Text>
                            </TouchableOpacity>

                            {/* Error display at the bottom as per screenshot */}
                            {error ? (
                                <View style={styles.errorBox}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}
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
    signUpButton: {
        width: '100%',
        height: 50,
        backgroundColor: theme.colors.secondary,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    signUpButtonText: {
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
    errorBox: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
        width: '100%',
    },
    errorText: {
        color: '#991b1b',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
});

