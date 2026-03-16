import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { LoginFormValues, RegisterFormValues } from '../lib/authSchemas';
import { Alert } from 'react-native';

export const useLogin = (onSuccess: (data: any) => void) => {
    return useMutation({
        mutationFn: authApi.signIn,
        onSuccess: async (data) => {
            try {
                if (data.user) {
                    const profile = await authApi.getProfile(data.user.id);

                    if (!profile.approved) {
                        Alert.alert(
                            "Pending Approval",
                            "Your account is pending approval by an administrator."
                        );
                        await authApi.signOut();
                        return;
                    }

                    if (!profile.company_id) {
                        Alert.alert(
                            "Company Assignment Pending",
                            "Your account is awaiting company assignment by an administrator."
                        );
                        await authApi.signOut();
                        return;
                    }

                    onSuccess(data);
                }
            } catch (error: any) {
                const msg = error?.message || "Failed to verify account.";
                const isUnconfirmed = /confirm|verification|email.*confirm/i.test(msg);
                Alert.alert(
                    isUnconfirmed ? "Confirm your email" : "Error",
                    isUnconfirmed
                        ? "Please open the confirmation link sent to your email, then try signing in again."
                        : msg
                );
                await authApi.signOut();
            }
        },
        onError: (error: any) => {
            const msg = (error?.message || '').toLowerCase();
            if (msg.includes('email not confirmed') || msg.includes('confirm your email')) {
                Alert.alert(
                    "Confirm your email",
                    "Please open the confirmation link sent to your email, then try signing in again."
                );
                return;
            }
            const message =
                msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')
                    ? "Incorrect email or password. Please try again."
                    : (error?.message || "Incorrect email or password. Please try again.");
            Alert.alert("Login Failed", message);
        },
    });
};

export const useRegister = (onSuccess: () => void, onError?: (error: any) => void) => {
    return useMutation({
        mutationFn: authApi.signUp,
        onSuccess: () => {
            Alert.alert(
                "Request Received",
                "Your request has been received. Please wait for confirmation from an administrator before you can sign in.",
                [{ text: "OK", onPress: onSuccess }]
            );
        },
        onError: (error: any) => {
            const message =
                error?.message?.toLowerCase().includes('already registered') ||
                error?.message?.toLowerCase().includes('already been registered')
                    ? "This email is already registered. Please sign in or use a different email."
                    : (error?.message || "Registration failed. Please try again.");
            Alert.alert("Sign Up Failed", message);
            if (onError) onError(error);
        },
    });
};

