import React, { useEffect, useState } from 'react';
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
import * as SecureStore from 'expo-secure-store';

interface LoginScreenProps {
    navigation: any;
}

interface RememberedCredential {
    email: string;
    password: string;
    lastUsedAt: number;
}

export const LoginScreen = ({ navigation }: LoginScreenProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [rememberedCredentials, setRememberedCredentials] = useState<RememberedCredential[]>([]);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetStatus, setResetStatus] = useState<'none' | 'error' | 'success'>('none');
    const [error, setError] = useState('');

    const REMEMBER_EMAIL_KEY = 'remembered_login_email';
    const REMEMBER_PASSWORD_KEY = 'remembered_login_password';
    const REMEMBERED_CREDENTIALS_KEY = 'remembered_login_credentials_v2';

    useEffect(() => {
        const loadRememberedCredentials = async () => {
            try {
                const [savedListRaw, savedEmail, savedPassword] = await Promise.all([
                    SecureStore.getItemAsync(REMEMBERED_CREDENTIALS_KEY),
                    SecureStore.getItemAsync(REMEMBER_EMAIL_KEY),
                    SecureStore.getItemAsync(REMEMBER_PASSWORD_KEY),
                ]);

                if (savedListRaw) {
                    const parsed = JSON.parse(savedListRaw) as RememberedCredential[];
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const clean = parsed
                            .filter((item) => item?.email && item?.password)
                            .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
                        setRememberedCredentials(clean);
                        setEmail(clean[0].email);
                        setPassword(clean[0].password);
                        setRememberMe(true);
                        return;
                    }
                }

                // Backward compatibility for previously saved single credential.
                if (savedEmail && savedPassword) {
                    const legacyCredential: RememberedCredential = {
                        email: savedEmail,
                        password: savedPassword,
                        lastUsedAt: Date.now(),
                    };
                    setRememberedCredentials([legacyCredential]);
                    setEmail(savedEmail);
                    setPassword(savedPassword);
                    setRememberMe(true);
                    await SecureStore.setItemAsync(
                        REMEMBERED_CREDENTIALS_KEY,
                        JSON.stringify([legacyCredential])
                    );
                }
            } catch {
                // Non-blocking: if secure storage fails, login still works normally.
            }
        };

        loadRememberedCredentials();
    }, []);

    const saveCredentialList = async (nextList: RememberedCredential[]) => {
        setRememberedCredentials(nextList);
        if (nextList.length === 0) {
            await Promise.all([
                SecureStore.deleteItemAsync(REMEMBERED_CREDENTIALS_KEY),
                SecureStore.deleteItemAsync(REMEMBER_EMAIL_KEY),
                SecureStore.deleteItemAsync(REMEMBER_PASSWORD_KEY),
            ]);
            return;
        }
        await Promise.all([
            SecureStore.setItemAsync(REMEMBERED_CREDENTIALS_KEY, JSON.stringify(nextList)),
            SecureStore.setItemAsync(REMEMBER_EMAIL_KEY, nextList[0].email),
            SecureStore.setItemAsync(REMEMBER_PASSWORD_KEY, nextList[0].password),
        ]);
    };

    const { mutate: login, isPending } = useLogin(async () => {
        try {
            if (rememberMe) {
                const normalizedEmail = email.trim();
                const nextList = [
                    { email: normalizedEmail, password, lastUsedAt: Date.now() },
                    ...rememberedCredentials.filter(
                        (item) => item.email.toLowerCase() !== normalizedEmail.toLowerCase()
                    ),
                ].slice(0, 5);
                await saveCredentialList(nextList);
            } else {
                const normalizedEmail = email.trim().toLowerCase();
                const remaining = rememberedCredentials.filter(
                    (item) => item.email.toLowerCase() !== normalizedEmail
                );
                await saveCredentialList(remaining);
            }
        } catch {
            // Non-blocking: auth succeeded, so do not block navigation on storage failure.
        }
        navigation.replace('MainApp');
    });

    const handleSignIn = () => {
        setError('');

        const normalizedEmail = email.trim();
        const result = loginSchema.safeParse({ email: normalizedEmail, password });
        if (!result.success) {
            setError(result.error.issues[0].message);
            return;
        }

        login({ email: normalizedEmail, password });
    };

    const handleSavedCredentialLogin = (credential: RememberedCredential) => {
        setError('');
        setEmail(credential.email);
        setPassword(credential.password);
        setRememberMe(true);
        login({ email: credential.email, password: credential.password });
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
                                            autoComplete="username"
                                            textContentType="username"
                                            importantForAutofill="yes"
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
                                            autoComplete="password"
                                            textContentType="password"
                                            importantForAutofill="yes"
                                        />
                                    </View>

                                    {/* Remember me */}
                                    <TouchableOpacity
                                        style={styles.rememberMeRow}
                                        onPress={() => setRememberMe((prev) => !prev)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                            {rememberMe ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                                        </View>
                                        <Text style={styles.rememberMeText}>Remember me</Text>
                                    </TouchableOpacity>

                                    {rememberedCredentials.length > 0 && (
                                        <View style={styles.savedAccountsContainer}>
                                            <Text style={styles.savedAccountsTitle}>Saved accounts</Text>
                                            {rememberedCredentials.map((credential) => (
                                                <TouchableOpacity
                                                    key={credential.email}
                                                    style={styles.savedAccountItem}
                                                    onPress={() => handleSavedCredentialLogin(credential)}
                                                    activeOpacity={0.85}
                                                    disabled={isPending}
                                                >
                                                    <Ionicons
                                                        name="mail-outline"
                                                        size={16}
                                                        color={theme.colors.textSecondary}
                                                    />
                                                    <Text style={styles.savedAccountText}>{credential.email}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

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
    rememberMeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -4,
        marginBottom: 8,
        gap: 10,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
    },
    checkboxChecked: {
        backgroundColor: theme.colors.secondary,
        borderColor: theme.colors.secondary,
    },
    rememberMeText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    savedAccountsContainer: {
        marginBottom: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        backgroundColor: theme.colors.surface,
    },
    savedAccountsTitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
    },
    savedAccountItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 8,
    },
    savedAccountText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
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
