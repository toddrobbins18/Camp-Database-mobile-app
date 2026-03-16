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
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useLogin } from '../hooks/useAuth';
import { loginSchema } from '../lib/authSchemas';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
    navigation: any;
}

export const LoginScreen = ({ navigation }: LoginScreenProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetStatus, setResetStatus] = useState<'none' | 'error' | 'success'>('none');
    const [error, setError] = useState('');

    const { mutate: login, isPending } = useLogin((data: any) => {
        navigation.replace('MainApp');
    });

    const handleSignIn = () => {
        setError('');

        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
            setError(result.error.issues[0].message);
            return;
        }

        login({ email, password });
    };


    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                        {/* Header */}
                        <Text style={styles.title}>{isForgotPassword ? 'Reset Password' : 'Welcome Back'}</Text>
                        <Text style={styles.subtitle}>
                            {isForgotPassword ? 'Follow instructions to reset password' : 'Sign in to manage The Nest'}
                        </Text>

                        {error ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Form */}
                        <View style={styles.form}>
                            {!isForgotPassword ? (
                                <>
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
                                        style={[styles.signInButton, isPending && { opacity: 0.7 }]}
                                        onPress={handleSignIn}
                                        activeOpacity={0.8}
                                        disabled={isPending}
                                    >
                                        <Text style={styles.signInButtonText}>
                                            {isPending ? 'Signing in...' : 'Sign in'}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Links */}
                                    <TouchableOpacity
                                        style={styles.linkContainer}
                                        onPress={() => {
                                            setIsForgotPassword(true);
                                            setResetStatus('none');
                                            setError('');
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
                                </>
                            ) : (
                                <>
                                    {/* Forgot Password Flow */}
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

                                    <TouchableOpacity
                                        style={styles.signInButton}
                                        onPress={async () => {
                                            setError('');
                                            if (!email.trim()) {
                                                setResetStatus('error');
                                                setError('Email is required for password recovery');
                                                return;
                                            }
                                            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                                                redirectTo: undefined,
                                            });
                                            if (resetError) {
                                                setResetStatus('error');
                                                setError(resetError.message || 'Failed to send reset email');
                                                return;
                                            }
                                            setResetStatus('success');
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.signInButtonText}>
                                            Send reset password instructions
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.linkContainer}
                                        onPress={() => {
                                            setIsForgotPassword(false);
                                            setResetStatus('none');
                                            setError('');
                                        }}
                                    >
                                        <Text style={styles.linkText}>Back to Sign In</Text>
                                    </TouchableOpacity>

                                    {resetStatus === 'success' && (
                                        <View style={styles.successBox}>
                                            <Text style={styles.successText}>
                                                Check your email for the password reset link
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
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
    errorBox: {
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginTop: theme.spacing.xl,
    },
    errorText: {
        color: '#991b1b',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    successBox: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginTop: theme.spacing.xl,
    },
    successText: {
        color: '#166534',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
});
