import { supabase } from "../utils/supabaseClient";

async function assertActiveSessionOrThrow() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Auth session error: ${error.message || String(error)}`);
  }

  const token = session?.access_token;
  if (!token) {
    throw new Error("No active auth session. Please sign in again.");
  }

  return token;
}

export async function approveProposal(proposal_id: string) {
  await assertActiveSessionOrThrow();
  const { data, error } = await supabase.functions.invoke("apply_action", {
    body: { proposal_id },
  });

  if (error) throw error;
  return data as { ok: true; appliedResult: any };
}

export async function declineProposal(proposal_id: string) {
  const { error } = await supabase
    .from("ai_action_proposals")
    .update({ status: "declined" })
    .eq("id", proposal_id);

  if (error) throw error;
}
