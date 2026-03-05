import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  ActionType,
  applyActionForUser,
  corsHeaders,
  jsonResponse,
  updateProposalStatus,
} from "../_shared/agent-core.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

const createAuthClient = (token: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Missing Supabase environment variables" }, 500);
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

    const userId = authData.user.id;
    const body = await req.json().catch(() => ({}));
    const proposalId = String(body?.proposal_id || "").trim();

    let actionType: ActionType | null = null;
    let actionPayload: Record<string, unknown> | null = null;
    let rowId: string | null = null;
    let currentStatus = "pending";

    if (proposalId) {
      const { data: proposalRow, error: proposalError } = await authClient
        .from("ai_action_proposals")
        .select("id, user_id, action_type, action_payload, status")
        .eq("id", proposalId)
        .single();

      if (proposalError) {
        return jsonResponse({ error: proposalError.message || "Proposal not found" }, 400);
      }

      if (proposalRow?.user_id && proposalRow.user_id !== userId) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      rowId = proposalRow?.id || proposalId;
      currentStatus = String(proposalRow?.status || "pending");
      actionType = proposalRow?.action_type as ActionType;
      actionPayload =
        proposalRow?.action_payload && typeof proposalRow.action_payload === "object"
          ? proposalRow.action_payload
          : {};
    } else if (body?.action_type && body?.action_payload) {
      actionType = body.action_type as ActionType;
      actionPayload = body.action_payload;
    } else {
      return jsonResponse({ error: "proposal_id is required" }, 400);
    }

    if (!actionType || !actionPayload) {
      return jsonResponse({ error: "Invalid proposal payload" }, 400);
    }

    if (currentStatus === "applied") {
      return jsonResponse({ ok: true, appliedResult: null, alreadyApplied: true });
    }

    try {
      const appliedResult = await applyActionForUser({
        client: authClient,
        userId,
        actionType,
        actionPayload,
      });

      if (rowId) {
        await updateProposalStatus({
          client: authClient,
          proposalId: rowId,
          status: "applied",
          details: {
            applied_at: new Date().toISOString(),
            applied_result: appliedResult ?? null,
          },
        });
      }

      return jsonResponse({
        ok: true,
        appliedResult,
      });
    } catch (applyError: any) {
      if (rowId) {
        await updateProposalStatus({
          client: authClient,
          proposalId: rowId,
          status: "failed",
          details: {
            error_message: String(
              applyError?.message || applyError || "Failed to apply proposal",
            ),
          },
        });
      }

      return jsonResponse(
        {
          error: String(applyError?.message || applyError || "Failed to apply proposal"),
        },
        400,
      );
    }
  } catch (error: any) {
    console.error("apply_action function error:", error);
    return jsonResponse(
      {
        error: String(error?.message || error || "Internal server error"),
      },
      500,
    );
  }
});
