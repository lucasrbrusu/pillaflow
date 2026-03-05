import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  applyActionForUser,
  corsHeaders,
  insertProposal,
  isMissingRelationError,
  jsonResponse,
  parseMessageToProposal,
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
    return jsonResponse({
      assistantText:
        "Server configuration is incomplete for the AI assistant. Add SUPABASE_URL and SUPABASE_ANON_KEY to this function environment.",
      conversationId: crypto.randomUUID(),
      proposals: [],
    });
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
    const message = String(body?.message || "").trim();
    const conversationId = String(body?.conversationId || crypto.randomUUID());

    if (!message) {
      return jsonResponse({
        assistantText: "Please type a message so I can help.",
        conversationId,
        proposals: [],
      });
    }

    const parsed = parseMessageToProposal(message);
    if (!parsed.proposal) {
      return jsonResponse({
        assistantText: parsed.assistantText,
        conversationId,
        proposals: [],
      });
    }

    const insertion = await insertProposal({
      client: authClient,
      userId,
      conversationId,
      message,
      proposal: parsed.proposal,
    });

    if (!insertion.error && insertion.data) {
      const proposalRow = {
        id: insertion.data.id,
        action_type: insertion.data.action_type ?? parsed.proposal.action_type,
        action_payload:
          insertion.data.action_payload ?? parsed.proposal.action_payload,
        status: insertion.data.status ?? "pending",
        created_at: insertion.data.created_at ?? null,
      };
      return jsonResponse({
        assistantText: parsed.assistantText,
        conversationId,
        proposals: proposalRow.id ? [proposalRow] : [],
      });
    }

    if (isMissingRelationError(insertion.error, "ai_action_proposals")) {
      const appliedResult = await applyActionForUser({
        client: authClient,
        userId,
        actionType: parsed.proposal.action_type,
        actionPayload: parsed.proposal.action_payload,
      });

      return jsonResponse({
        assistantText: "Done. I saved that directly because the proposals table is unavailable.",
        conversationId,
        proposals: [],
        appliedResult,
      });
    }

    try {
      const appliedResult = await applyActionForUser({
        client: authClient,
        userId,
        actionType: parsed.proposal.action_type,
        actionPayload: parsed.proposal.action_payload,
      });
      return jsonResponse({
        assistantText:
          "Done. I could not create an approval draft, so I saved the action directly.",
        conversationId,
        proposals: [],
        appliedResult,
      });
    } catch (fallbackApplyError) {
      console.error("Agent proposal insert failed:", insertion.error);
      console.error("Agent fallback apply failed:", fallbackApplyError);
    }

    return jsonResponse({
      assistantText:
        "I understood your request, but I could not save the draft action right now. Please try again.",
      conversationId,
      proposals: [],
    });
  } catch (error) {
    console.error("Agent function error:", error);
    return jsonResponse({
      assistantText: "I hit an internal error while processing that request.",
      proposals: [],
      conversationId: crypto.randomUUID(),
    });
  }
});
