import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const emailVerificationSecret = Deno.env.get("EMAIL_VERIFICATION_SECRET") || "";

const PROFILE_SELECT = "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const createAuthClient = (token: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();

const isMissingColumnError = (error: any, column: string) => {
  if (!error) return false;
  const combined = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`
    .toLowerCase();
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    combined.includes("does not exist") ||
    combined.includes(`column ${column}`) ||
    combined.includes(`'${column}'`) ||
    combined.includes(`"${column}"`)
  );
};

const getProfileRow = async (userId: string) => {
  const tryLookup = async (column: "id" | "user_id") => {
    const { data, error } = await adminClient
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq(column, userId)
      .maybeSingle();

    if (error && isMissingColumnError(error, column)) {
      return { row: null, lookupColumn: null, error: null };
    }

    return {
      row: data || null,
      lookupColumn: data ? column : null,
      error,
    };
  };

  const byId = await tryLookup("id");
  if (byId.error) return byId;
  if (byId.row) return byId;

  return await tryLookup("user_id");
};

const sha256Hex = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const hashVerificationCode = async (userId: string, email: string, code: string) =>
  await sha256Hex(`${userId}:${email}:${code}:${emailVerificationSecret}`);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !emailVerificationSecret) {
    return jsonResponse({ error: "Missing server configuration." }, 500);
  }

  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : "";
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

    const authClient = createAuthClient(token);
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData?.user?.id) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (code.length !== 6) {
      return jsonResponse({ error: "Enter the 6-digit verification code." }, 400);
    }

    const userId = authData.user.id;
    const profileResult = await getProfileRow(userId);
    if (profileResult.error) {
      return jsonResponse(
        { error: profileResult.error.message || "Unable to load profile." },
        400,
      );
    }

    const profileRow = profileResult.row;
    const lookupColumn = profileResult.lookupColumn;
    const profileEmail = normalizeEmail(profileRow?.email);

    if (!profileRow || !lookupColumn || !profileEmail) {
      return jsonResponse(
        { error: "Add an email address to your profile before verifying it." },
        400,
      );
    }

    if (profileRow.email_verified) {
      return jsonResponse({
        ok: true,
        emailVerified: true,
        emailVerifiedAt: profileRow.email_verified_at || new Date().toISOString(),
      });
    }

    const { data: codeRow, error: codeError } = await adminClient
      .from("email_verification_codes")
      .select("id, code_hash, expires_at, consumed_at")
      .eq("user_id", userId)
      .eq("email", profileEmail)
      .is("consumed_at", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) {
      return jsonResponse(
        { error: codeError.message || "Unable to verify email." },
        400,
      );
    }

    if (!codeRow) {
      return jsonResponse(
        { error: "No active verification code was found. Request a new code." },
        400,
      );
    }

    const expiresAtMs = new Date(codeRow.expires_at).getTime();
    if (Number.isNaN(expiresAtMs) || expiresAtMs <= Date.now()) {
      return jsonResponse({ error: "This verification code has expired." }, 400);
    }

    const expectedHash = await hashVerificationCode(userId, profileEmail, code);
    if (expectedHash !== codeRow.code_hash) {
      return jsonResponse({ error: "That verification code is invalid." }, 400);
    }

    const nowIso = new Date().toISOString();

    const { error: consumeError } = await adminClient
      .from("email_verification_codes")
      .update({ consumed_at: nowIso })
      .eq("id", codeRow.id);

    if (consumeError) {
      return jsonResponse(
        { error: consumeError.message || "Unable to verify email." },
        400,
      );
    }

    const profileIdentifier = lookupColumn === "id" ? profileRow.id : profileRow.user_id;
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        email_verified: true,
        email_verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq(lookupColumn, profileIdentifier);

    if (updateError) {
      return jsonResponse(
        { error: updateError.message || "Unable to update verification status." },
        400,
      );
    }

    return jsonResponse({
      ok: true,
      emailVerified: true,
      emailVerifiedAt: nowIso,
    });
  } catch (error: any) {
    console.error("verify-email-code error:", error);
    return jsonResponse(
      { error: String(error?.message || error || "Internal server error") },
      500,
    );
  }
});
