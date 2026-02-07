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
                Alert.alert("Error", error.message || "Failed to verify account.");
                await authApi.signOut();
            }
        },
        onError: (error: any) => {
            Alert.alert("Login Failed", error.message || "Invalid credentials.");
        },
    });
};

export const useRegister = (onSuccess: () => void, onError?: (error: any) => void) => {
    return useMutation({
        mutationFn: authApi.signUp,
        onSuccess: () => {
            Alert.alert(
                "Success",
                "Registration successful! Your account is pending administrator approval.",
                [{ text: "OK", onPress: onSuccess }]
            );
        },
        onError: (error: any) => {
            if (onError) {
                onError(error);
            } else {
                Alert.alert("Registration Failed", error.message || "Failed to create account.");
            }
        },
    });
};

