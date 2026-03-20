import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const emailVerificationSecret = Deno.env.get("EMAIL_VERIFICATION_SECRET") || "";

const MIN_INTERVAL_SECONDS = 60;
const CODE_EXPIRY_MINUTES = 15;
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

const createVerificationCode = () => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1_000_000).padStart(6, "0");
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

const summarizeHttpBody = (body: string) =>
  String(body || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);

const sendVerificationEmail = async (email: string, code: string) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Pillaflow <noreply@pillaflow.com>",
      to: [email],
      subject: "Your Pillaflow verification code",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2 style="margin-bottom:12px;">Verify your email</h2>
          <p>Use this code in Pillaflow to verify your email address:</p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0;">${code}</div>
          <p>This code expires in ${CODE_EXPIRY_MINUTES} minutes.</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
      text:
        `Verify your email in Pillaflow.\n\n` +
        `Your verification code is: ${code}\n\n` +
        `This code expires in ${CODE_EXPIRY_MINUTES} minutes.`,
    }),
  });

  const contentType = response.headers.get("content-type") || "";
  const rawBody = await response.text();
  let payload: Record<string, unknown> = {};

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch (_parseError) {
      payload = {};
    }
  }

  if (!response.ok) {
    const payloadMessage = payload["message"];
    const payloadError = payload["error"];
    const payloadName = payload["name"];
    const payloadSummary =
      (typeof payloadMessage === "string" && payloadMessage.trim()) ||
      (typeof payloadError === "string" && payloadError.trim()) ||
      (typeof payloadName === "string" && payloadName.trim()) ||
      "";
    const bodySummary = summarizeHttpBody(rawBody);
    throw new Error(
      String(
        payloadSummary ||
          bodySummary ||
          `Resend request failed with status ${response.status}.`
      ),
    );
  }

  return payload;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseServiceRoleKey ||
    !resendApiKey ||
    !emailVerificationSecret
  ) {
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
    const requestedEmail = normalizeEmail(body?.email);
    const userId = authData.user.id;

    const profileResult = await getProfileRow(userId);
    if (profileResult.error) {
      return jsonResponse(
        { error: profileResult.error.message || "Unable to load profile." },
        400,
      );
    }

    const profileRow = profileResult.row;
    const profileEmail = normalizeEmail(profileRow?.email);
    if (!profileEmail) {
      return jsonResponse(
        { error: "Add an email address to your profile before verifying it." },
        400,
      );
    }

    if (requestedEmail && requestedEmail !== profileEmail) {
      return jsonResponse(
        { error: "Save your new email address before sending a verification code." },
        400,
      );
    }

    const { data: latestCodeRow, error: latestCodeError } = await adminClient
      .from("email_verification_codes")
      .select("sent_at")
      .eq("user_id", userId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestCodeError) {
      return jsonResponse(
        { error: latestCodeError.message || "Unable to send verification email." },
        400,
      );
    }

    if (latestCodeRow?.sent_at) {
      const lastSentMs = new Date(latestCodeRow.sent_at).getTime();
      const retryAfterSeconds = Math.ceil(
        (lastSentMs + MIN_INTERVAL_SECONDS * 1000 - Date.now()) / 1000,
      );
      if (retryAfterSeconds > 0) {
        return jsonResponse(
          {
            error: `Please wait ${retryAfterSeconds}s before requesting another code.`,
            retryAfterSeconds,
          },
          429,
        );
      }
    }

    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(
      Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000,
    ).toISOString();
    const code = createVerificationCode();
    const codeHash = await hashVerificationCode(userId, profileEmail, code);

    await adminClient
      .from("email_verification_codes")
      .update({ consumed_at: nowIso })
      .eq("user_id", userId)
      .is("consumed_at", null);

    const { data: insertedRow, error: insertError } = await adminClient
      .from("email_verification_codes")
      .insert({
        user_id: userId,
        email: profileEmail,
        code_hash: codeHash,
        sent_at: nowIso,
        expires_at: expiresAtIso,
      })
      .select("id")
      .single();

    if (insertError) {
      return jsonResponse(
        { error: insertError.message || "Unable to store verification code." },
        400,
      );
    }

    try {
      await sendVerificationEmail(profileEmail, code);
    } catch (emailError: any) {
      if (insertedRow?.id) {
        await adminClient.from("email_verification_codes").delete().eq("id", insertedRow.id);
      }
      throw emailError;
    }

    return jsonResponse({
      ok: true,
      email: profileEmail,
      expiresAt: expiresAtIso,
    });
  } catch (error: any) {
    console.error("send-email-verification error:", error);
    return jsonResponse(
      { error: String(error?.message || error || "Internal server error") },
      500,
    );
  }
});
