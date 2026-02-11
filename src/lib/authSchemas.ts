import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    full_name: z.string().trim().min(1, "Full name is required").max(100, "Name must be less than 100 characters"),
    company_id: z.string().uuid("Invalid company ID").optional().nullable(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
