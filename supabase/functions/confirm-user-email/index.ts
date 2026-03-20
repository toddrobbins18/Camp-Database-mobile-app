import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
        const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
        if (!token) {
            return jsonResponse({ error: "Missing Authorization header." }, 401);
        }

        let body: { userId?: string };
        try {
            body = await req.json();
        } catch {
            return jsonResponse({ error: "Invalid request body. Send { userId }." }, 400);
        }

        const { userId } = body ?? {};
        if (!userId) {
            return jsonResponse({ error: "userId is required." }, 400);
        }

        const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\s+/g, "").replace(/\/+$/, "");
        const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();

        if (!supabaseUrl || !serviceKey) {
            return jsonResponse({ error: "Server misconfiguration (missing env)." }, 500);
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceKey);

        // Verify caller has admin/super_admin in user_roles
        const { data: callerUser, error: callerAuthErr } = await supabaseAdmin.auth.getUser(token);
        if (callerAuthErr || !callerUser?.user) {
            return jsonResponse({ error: callerAuthErr?.message ?? "Unauthorized." }, 401);
        }
        const callerId = callerUser.user.id;

        const { data: rolesData, error: rolesErr } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", callerId);

        if (rolesErr) {
            return jsonResponse({ error: "Could not verify your role." }, 500);
        }

        const roles = (rolesData ?? []).map((r: any) => String(r?.role ?? "").toLowerCase());
        const isAdmin = roles.includes("admin") || roles.includes("super_admin");
        if (!isAdmin) {
            return jsonResponse({ error: "Forbidden: Admin/Super Admin role required." }, 403);
        }

        // Confirm email in Auth so password sign-in works.
        // Prefer the Admin SDK helper if available; otherwise fall back to GoTrue REST.
        try {
            // @ts-ignore - runtime API may exist even if typings differ between versions.
            const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                email_confirm: true,
            });
            if (updateErr) throw updateErr;
        } catch (_) {
            const anonKey = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
            const apikey = anonKey || serviceKey;
            const restBody = JSON.stringify({ email_confirm: true });

            // GoTrue admin update is usually POST; we try POST then PATCH.
            const tryReq = async (method: string) => {
                const r = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
                    method,
                    headers: {
                        Authorization: `Bearer ${serviceKey}`,
                        apikey,
                        "Content-Type": "application/json",
                    },
                    body: restBody,
                });
                if (!r.ok) return { ok: false, status: r.status };
                return { ok: true, status: r.status };
            };

            const postRes = await tryReq("POST");
            if (!postRes.ok) {
                const patchRes = await tryReq("PATCH");
                if (!patchRes.ok) {
                    return jsonResponse({ error: "Failed to confirm user email via GoTrue admin API." }, 400);
                }
            }
        }

        return jsonResponse({ success: true }, 200);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return jsonResponse({ error: msg ?? "Failed." }, 500);
    }
});

