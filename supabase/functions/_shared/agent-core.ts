export type ActionType =
  | "create_task"
  | "update_task"
  | "create_habit"
  | "complete_habit"
  | "create_note"
  | "log_health_daily"
  | "add_food_entry"
  | "create_routine"
  | "add_routine_task"
  | "create_reminder"
  | "create_chore"
  | "create_grocery";

export type ActionProposal = {
  action_type: ActionType;
  action_payload: Record<string, unknown>;
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const WEEKLY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const isMissingRelationError = (error: any, relation = "") => {
  const message = String(error?.message || "");
  if (error?.code === "42P01") return true;
  if (!relation) return /relation .* does not exist/i.test(message);
  return new RegExp(`relation .*${relation}.* does not exist`, "i").test(
    message,
  );
};

export const isMissingColumnError = (error: any) => {
  const message = String(error?.message || "");
  return (
    error?.code === "42703" ||
    /column .* does not exist/i.test(message) ||
    /could not find the .* column/i.test(message)
  );
};

export const extractMissingColumnName = (error: any): string | null => {
  const message = String(error?.message || "");
  const directMatch = message.match(/column ["']?([a-zA-Z0-9_]+)["']?/i);
  if (directMatch?.[1]) return directMatch[1];
  const postgrestMatch = message.match(
    /Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i,
  );
  return postgrestMatch?.[1] || null;
};

export const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toDateISO = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toTimeHHMM = (hour24: number, minute: number) =>
  `${String(Math.max(0, Math.min(23, hour24))).padStart(2, "0")}:${String(
    Math.max(0, Math.min(59, minute)),
  ).padStart(2, "0")}`;

const getNextWeekday = (baseDate: Date, targetIndex: number) => {
  const copy = new Date(baseDate);
  const currentIndex = copy.getDay();
  let offset = (targetIndex - currentIndex + 7) % 7;
  if (offset === 0) offset = 7;
  copy.setDate(copy.getDate() + offset);
  return copy;
};

const parseDateFromMessage = (message: string, now = new Date()) => {
  const lower = message.toLowerCase();
  if (lower.includes("tomorrow")) {
    const date = new Date(now);
    date.setDate(now.getDate() + 1);
    return toDateISO(date);
  }
  if (lower.includes("today") || lower.includes("tonight")) {
    return toDateISO(now);
  }

  const weekdayMatch = lower.match(
    /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  );
  if (weekdayMatch?.[1]) {
    const target = WEEKDAY_TO_INDEX[weekdayMatch[1]];
    if (target !== undefined) {
      return toDateISO(getNextWeekday(now, target));
    }
  }

  const isoMatch = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slashMatch = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const yearRaw = slashMatch[3];
    const year = yearRaw
      ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
      : now.getFullYear();
    if (
      Number.isInteger(month) &&
      Number.isInteger(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31 &&
      Number.isInteger(year)
    ) {
      const date = new Date(year, month - 1, day);
      return toDateISO(date);
    }
  }

  return toDateISO(now);
};

const parseTimeFromMessage = (message: string, defaultTime = "09:00") => {
  const lower = message.toLowerCase();

  const amPmMatch = lower.match(/\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/);
  if (amPmMatch) {
    let hour = Number(amPmMatch[1]);
    const minute = Number(amPmMatch[2] || "0");
    const ampm = amPmMatch[3];
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    return toTimeHHMM(hour, minute);
  }

  const militaryMatch = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (militaryMatch) {
    return toTimeHHMM(Number(militaryMatch[1]), Number(militaryMatch[2]));
  }

  if (lower.includes("morning")) return "09:00";
  if (lower.includes("afternoon")) return "15:00";
  if (lower.includes("evening")) return "18:00";
  if (lower.includes("night") || lower.includes("tonight")) return "20:00";

  return defaultTime;
};

const stripDateTimeHints = (value: string) =>
  value
    .replace(
      /\b(today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      " ",
    )
    .replace(/\b(on|for|at)\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\b/gi, " ")
    .replace(/\b\d{1,2}:\d{2}\b/gi, " ")
    .replace(/\b(20\d{2})-(\d{2})-(\d{2})\b/g, " ")
    .replace(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g, " ")
    .replace(/[.?!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractQuotedText = (message: string) => {
  const doubleQuoted = message.match(/"([^"]+)"/);
  if (doubleQuoted?.[1]) return doubleQuoted[1].trim();
  const singleQuoted = message.match(/'([^']+)'/);
  return singleQuoted?.[1]?.trim() || "";
};

const extractIntentTitle = (
  message: string,
  label: string,
  fallback: string,
) => {
  const quoted = extractQuotedText(message);
  if (quoted) return quoted;

  const lower = message.toLowerCase();
  const labelPattern = label.replace(/\s+/g, "\\s+");
  const directMatch = lower.match(
    new RegExp(
      `(?:${labelPattern})\\s+(?:to|for)?\\s*(.+)$`,
      "i",
    ),
  );
  if (directMatch?.[1]) {
    const cleaned = stripDateTimeHints(directMatch[1]);
    if (cleaned) return cleaned;
  }

  const commandMatch = message.match(
    /(?:create|add|make|set|schedule|track|log)\s+(.+)$/i,
  );
  if (commandMatch?.[1]) {
    const cleaned = stripDateTimeHints(commandMatch[1]);
    if (cleaned) return cleaned;
  }

  return fallback;
};

const parseWaterLiters = (message: string) => {
  const lower = message.toLowerCase();
  const match = lower.match(/\b(\d+(?:\.\d+)?)\s*(ml|milliliters?|l|liters?)\b/);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (unit.startsWith("ml")) return Math.round((amount / 1000) * 100) / 100;
  return Math.round(amount * 100) / 100;
};

const parseCalories = (message: string) => {
  const lower = message.toLowerCase();
  const match = lower.match(/\b(\d{2,5})\s*(kcal|calories?|cals?)\b/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseMessageToProposal = (
  message: string,
): {
  assistantText: string;
  proposal: ActionProposal | null;
} => {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const now = new Date();
  const date = parseDateFromMessage(text, now);
  const time = parseTimeFromMessage(text);

  if (!text) {
    return {
      assistantText: "Tell me what you want to create, and I will draft it.",
      proposal: null,
    };
  }

  if (lower.includes("habit")) {
    const title = extractIntentTitle(text, "habit", "New habit");
    return {
      assistantText: `I drafted a habit: "${title}". Tap Approve to save it.`,
      proposal: {
        action_type: "create_habit",
        action_payload: {
          title,
          repeat: "Daily",
          days: [],
          category: "Personal",
        },
      },
    };
  }

  if (lower.includes("note")) {
    const title = extractIntentTitle(text, "note", "New note");
    return {
      assistantText: `I drafted a note: "${title}". Tap Approve to save it.`,
      proposal: {
        action_type: "create_note",
        action_payload: {
          title,
          content: "",
        },
      },
    };
  }

  if (lower.includes("routine")) {
    const name = extractIntentTitle(text, "routine", "New routine");
    const startTime = parseTimeFromMessage(text, "08:00");
    const startHour = Number(startTime.split(":")[0] || "8");
    const endTime = toTimeHHMM(Math.min(23, startHour + 1), 0);
    return {
      assistantText: `I drafted a routine: "${name}". Tap Approve to save it.`,
      proposal: {
        action_type: "create_routine",
        action_payload: {
          name,
          repeat: "Daily",
          days: [],
          startTime,
          endTime,
        },
      },
    };
  }

  if (lower.includes("reminder") || lower.includes("remind")) {
    const title = extractIntentTitle(text, "reminder", "New reminder");
    return {
      assistantText: `I drafted a reminder: "${title}" for ${date} at ${time}. Tap Approve to save it.`,
      proposal: {
        action_type: "create_reminder",
        action_payload: {
          title,
          description: "",
          date,
          time,
        },
      },
    };
  }

  if (lower.includes("chore")) {
    const title = extractIntentTitle(text, "chore", "New chore");
    return {
      assistantText: `I drafted a chore: "${title}". Tap Approve to save it.`,
      proposal: {
        action_type: "create_chore",
        action_payload: {
          title,
          date,
        },
      },
    };
  }

  if (
    lower.includes("grocery") ||
    lower.includes("grocer") ||
    lower.includes("shopping")
  ) {
    const name = extractIntentTitle(text, "grocery", "New grocery item");
    return {
      assistantText: `I drafted a grocery item: "${name}". Tap Approve to save it.`,
      proposal: {
        action_type: "create_grocery",
        action_payload: {
          name,
          dueDate: date,
          dueTime: time,
        },
      },
    };
  }

  if (lower.includes("meal") || lower.includes("food")) {
    const name = extractIntentTitle(text, "meal", "Meal");
    const calories = parseCalories(text);
    return {
      assistantText:
        `I drafted a food entry: "${name}". Tap Approve to save it.` +
        (calories ? ` (${calories} calories)` : ""),
      proposal: {
        action_type: "add_food_entry",
        action_payload: {
          date,
          name,
          calories: calories ?? 0,
        },
      },
    };
  }

  if (
    lower.includes("health") ||
    lower.includes("water") ||
    lower.includes("sleep") ||
    lower.includes("mood")
  ) {
    const waterIntake = parseWaterLiters(text);
    return {
      assistantText:
        "I drafted a health log for today. Tap Approve to save it." +
        (waterIntake ? ` (water ${waterIntake}L)` : ""),
      proposal: {
        action_type: "log_health_daily",
        action_payload: {
          date,
          waterIntake: waterIntake ?? undefined,
        },
      },
    };
  }

  if (lower.includes("task") || /\b(create|add|make|schedule)\b/.test(lower)) {
    const title = extractIntentTitle(text, "task", "New task");
    return {
      assistantText: `I drafted a task: "${title}" for ${date} at ${time}. Tap Approve to save it.`,
      proposal: {
        action_type: "create_task",
        action_payload: {
          title,
          description: "",
          priority: "medium",
          date,
          time,
        },
      },
    };
  }

  return {
    assistantText:
      "I can help create tasks, habits, notes, routines, reminders, chores, groceries, and health logs. Tell me one action to create.",
    proposal: null,
  };
};

const insertWithMissingColumnFallback = async ({
  client,
  table,
  payload,
  select: _select,
  optionalColumns = [],
}: {
  client: any;
  table: string;
  payload: Record<string, unknown>;
  select: string;
  optionalColumns?: string[];
}) => {
  let mutablePayload: Record<string, unknown> = { ...payload };
  let remainingOptional = new Set(optionalColumns);

  for (let attempt = 0; attempt <= optionalColumns.length + 2; attempt += 1) {
    const { data, error } = await client
      .from(table)
      .insert(mutablePayload)
      .select()
      .single();

    if (!error) {
      return { data, error: null };
    }

    if (!isMissingColumnError(error)) {
      return { data: null, error };
    }

    const missingColumn = extractMissingColumnName(error);
    let removable: string | null = null;
    if (
      missingColumn &&
      Object.prototype.hasOwnProperty.call(mutablePayload, missingColumn) &&
      (remainingOptional.size === 0 || remainingOptional.has(missingColumn))
    ) {
      removable = missingColumn;
    } else {
      removable =
        Array.from(remainingOptional).find((column) =>
          Object.prototype.hasOwnProperty.call(mutablePayload, column),
        ) || null;
    }

    if (!removable) {
      return { data: null, error };
    }

    delete mutablePayload[removable];
    remainingOptional.delete(removable);
  }

  return {
    data: null,
    error: { message: "Insert retries exhausted" },
  };
};

const upsertWithMissingColumnFallback = async ({
  client,
  table,
  payload,
  onConflict,
  select: _select,
  optionalColumns = [],
}: {
  client: any;
  table: string;
  payload: Record<string, unknown>;
  onConflict: string;
  select: string;
  optionalColumns?: string[];
}) => {
  let mutablePayload: Record<string, unknown> = { ...payload };
  let remainingOptional = new Set(optionalColumns);

  for (let attempt = 0; attempt <= optionalColumns.length + 2; attempt += 1) {
    const { data, error } = await client
      .from(table)
      .upsert(mutablePayload, { onConflict })
      .select()
      .single();

    if (!error) {
      return { data, error: null };
    }

    if (!isMissingColumnError(error)) {
      return { data: null, error };
    }

    const missingColumn = extractMissingColumnName(error);
    let removable: string | null = null;
    if (
      missingColumn &&
      Object.prototype.hasOwnProperty.call(mutablePayload, missingColumn) &&
      (remainingOptional.size === 0 || remainingOptional.has(missingColumn))
    ) {
      removable = missingColumn;
    } else {
      removable =
        Array.from(remainingOptional).find((column) =>
          Object.prototype.hasOwnProperty.call(mutablePayload, column),
        ) || null;
    }

    if (!removable) {
      return { data: null, error };
    }

    delete mutablePayload[removable];
    remainingOptional.delete(removable);
  }

  return {
    data: null,
    error: { message: "Upsert retries exhausted" },
  };
};

export const insertProposal = async ({
  client,
  userId,
  conversationId,
  message,
  proposal,
}: {
  client: any;
  userId: string;
  conversationId: string;
  message: string;
  proposal: ActionProposal;
}) => {
  const basePayload: Record<string, unknown> = {
    user_id: userId,
    conversation_id: conversationId,
    source_message: message,
    action_type: proposal.action_type,
    action_payload: proposal.action_payload,
    status: "pending",
  };

  return insertWithMissingColumnFallback({
    client,
    table: "ai_action_proposals",
    payload: basePayload,
    select: "id, action_type, action_payload, status, created_at",
    optionalColumns: [
      "conversation_id",
      "source_message",
      "status",
      "user_id",
      "created_at",
    ],
  });
};

export const updateProposalStatus = async ({
  client,
  proposalId,
  status,
  details,
}: {
  client: any;
  proposalId: string;
  status: "pending" | "applied" | "declined" | "failed";
  details?: Record<string, unknown>;
}) => {
  let payload: Record<string, unknown> = {
    status,
    ...details,
    updated_at: new Date().toISOString(),
  };
  const optionalColumns = new Set([
    "updated_at",
    "applied_at",
    "applied_result",
    "error_message",
  ]);

  for (let attempt = 0; attempt <= optionalColumns.size + 2; attempt += 1) {
    const { error } = await client
      .from("ai_action_proposals")
      .update(payload)
      .eq("id", proposalId);
    if (!error) return;
    if (!isMissingColumnError(error)) return;
    const missing = extractMissingColumnName(error);
    let removable: string | null = null;
    if (
      missing &&
      Object.prototype.hasOwnProperty.call(payload, missing) &&
      optionalColumns.has(missing)
    ) {
      removable = missing;
    } else {
      removable =
        Array.from(optionalColumns).find((column) =>
          Object.prototype.hasOwnProperty.call(payload, column),
        ) || null;
    }
    if (!removable) return;
    delete payload[removable];
    optionalColumns.delete(removable);
  }
};

const resolvePriority = (value: unknown) => {
  const normalized = String(value || "medium").toLowerCase();
  if (normalized === "low" || normalized === "high") return normalized;
  return "medium";
};

const resolveRoutineRepeat = (value: unknown) => {
  const normalized = String(value || "daily").toLowerCase();
  if (normalized === "weekly") return "Weekly";
  if (normalized === "monthly") return "Monthly";
  return "Daily";
};

const resolveRoutineDays = (value: unknown, repeatValue: string) => {
  if (!Array.isArray(value)) return [];
  if (repeatValue === "Weekly") {
    const normalized = value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .map((item) => item.slice(0, 3))
      .map((item) => `${item[0].toUpperCase()}${item.slice(1).toLowerCase()}`);
    return normalized.filter((item) => WEEKLY_LABELS.includes(item));
  }
  if (repeatValue === "Monthly") {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 1 && item <= 31)
      .map((item) => String(item));
  }
  return [];
};

export const applyActionForUser = async ({
  client,
  userId,
  actionType,
  actionPayload,
}: {
  client: any;
  userId: string;
  actionType: ActionType;
  actionPayload: Record<string, unknown>;
}) => {
  const todayISO = toDateISO(new Date());
  const defaultTime = "09:00";

  if (actionType === "create_task") {
    const title = String(actionPayload?.title || "").trim() || "New task";
    const date = String(actionPayload?.date || todayISO);
    const time = String(actionPayload?.time || defaultTime);
    const payload: Record<string, unknown> = {
      user_id: userId,
      title,
      description: String(actionPayload?.description || "").trim() || null,
      priority: resolvePriority(actionPayload?.priority),
      date,
      time,
      completed: false,
      duration_minutes:
        typeof actionPayload?.durationMinutes === "number"
          ? actionPayload.durationMinutes
          : typeof actionPayload?.duration_minutes === "number"
          ? actionPayload.duration_minutes
          : undefined,
      category:
        typeof actionPayload?.category === "string"
          ? String(actionPayload.category).trim() || undefined
          : undefined,
    };

    const { data, error } = await insertWithMissingColumnFallback({
      client,
      table: "tasks",
      payload,
      select: "id, title, description, priority, date, time, completed, created_at",
      optionalColumns: ["duration_minutes", "category", "description", "priority"],
    });
    if (error) throw error;
    return data;
  }

  if (actionType === "create_habit") {
    const title = String(actionPayload?.title || "").trim() || "New habit";
    const payload: Record<string, unknown> = {
      user_id: userId,
      title,
      category: String(actionPayload?.category || "Personal"),
      description: String(actionPayload?.description || "").trim() || null,
      repeat: String(actionPayload?.repeat || "Daily"),
      days: Array.isArray(actionPayload?.days) ? actionPayload.days : [],
      streak: 0,
      color: String(actionPayload?.color || "#9B5DE5"),
      emoji: String(actionPayload?.emoji || "").trim() || null,
    };
    const { data, error } = await insertWithMissingColumnFallback({
      client,
      table: "habits",
      payload,
      select: "id, title, category, repeat, days, streak, created_at",
      optionalColumns: ["description", "color", "emoji"],
    });
    if (error) throw error;
    return data;
  }

  if (actionType === "create_note") {
    const title = String(actionPayload?.title || "").trim() || "New note";
    const content = String(actionPayload?.content || "");
    const { data, error } = await insertWithMissingColumnFallback({
      client,
      table: "notes",
      payload: {
        user_id: userId,
        title,
        content,
        password_hash: null,
      },
      select: "id, title, content, created_at, updated_at",
      optionalColumns: ["password_hash", "updated_at"],
    });
    if (error) throw error;
    return data;
  }

  if (actionType === "create_routine") {
    const name = String(actionPayload?.name || "").trim() || "New routine";
    const repeat = resolveRoutineRepeat(actionPayload?.repeat);
    const days = resolveRoutineDays(actionPayload?.days, repeat);
    const startTime = String(actionPayload?.startTime || "08:00");
    const endTime = String(actionPayload?.endTime || "09:00");

    const routinePayload: Record<string, unknown> = {
      user_id: userId,
      name,
      repeat,
      days,
      start_time: startTime,
      end_time: endTime,
      month_days:
        repeat === "Monthly"
          ? days.map((day) => Number(day)).filter((day) => Number.isInteger(day))
          : [],
    };

    const insertedRoutine = await insertWithMissingColumnFallback({
      client,
      table: "routines",
      payload: routinePayload,
      select: "id, name, repeat, days, start_time, end_time, created_at",
      optionalColumns: ["month_days", "repeat", "days", "start_time", "end_time"],
    });
    if (insertedRoutine.error) throw insertedRoutine.error;
    const routine = insertedRoutine.data;

    const tasks = Array.isArray(actionPayload?.tasks)
      ? actionPayload.tasks
      : [];
    if (routine?.id && tasks.length) {
      const rows = tasks
        .map((task, index) => ({
          user_id: userId,
          routine_id: routine.id,
          name: String(task || "").trim(),
          position: index,
        }))
        .filter((task) => Boolean(task.name));
      if (rows.length) {
        const { error } = await client
          .from("routine_tasks")
          .insert(rows);
        if (error && !isMissingRelationError(error, "routine_tasks")) {
          throw error;
        }
      }
    }

    return routine;
  }

  if (actionType === "add_routine_task") {
    const routineId = String(
      actionPayload?.routine_id || actionPayload?.routineId || "",
    ).trim();
    if (!routineId) throw new Error("Missing routine_id in action payload.");
    const taskName = String(actionPayload?.name || "").trim() || "New task";
    const positionValue =
      Number.isFinite(Number(actionPayload?.position))
        ? Number(actionPayload.position)
        : 0;
    const { data, error } = await insertWithMissingColumnFallback({
      client,
      table: "routine_tasks",
      payload: {
        user_id: userId,
        routine_id: routineId,
        name: taskName,
        position: positionValue,
      },
      select: "id, routine_id, name, position, created_at",
      optionalColumns: ["position"],
    });
    if (error) throw error;
    return data;
  }

  if (actionType === "create_reminder") {
    const title = String(actionPayload?.title || "").trim() || "New reminder";
    const date = String(actionPayload?.date || todayISO);
    const time = String(actionPayload?.time || defaultTime);
    const payload: Record<string, unknown> = {
      user_id: userId,
      title,
      description: String(actionPayload?.description || "").trim() || null,
      date,
      time,
    };
    const { data, error } = await insertWithMissingColumnFallback({
      client,
      table: "reminders",
      payload,
      select: "id, title, description, date, time, created_at",
      optionalColumns: ["description", "time"],
    });
    if (error) throw error;
    return data;
  }

  if (actionType === "create_chore") {
    const title = String(actionPayload?.title || "").trim() || "New chore";
    const date = String(actionPayload?.date || todayISO);
    const { data, error } = await insertWithMissingColumnFallback({
      client,
      table: "chores",
      payload: {
        user_id: userId,
        title,
        date,
        completed: false,
      },
      select: "id, title, date, completed, created_at",
      optionalColumns: ["date"],
    });
    if (error) throw error;
    return data;
  }

  if (actionType === "create_grocery") {
    const name = String(
      actionPayload?.name ||
        actionPayload?.title ||
        actionPayload?.grocery ||
        "New grocery item",
    )
      .trim();
    const dueDate = String(actionPayload?.dueDate || actionPayload?.date || "")
      .trim() || null;
    const dueTime = String(actionPayload?.dueTime || actionPayload?.time || "")
      .trim() || null;
    const payload: Record<string, unknown> = {
      user_id: userId,
      name,
      completed: false,
      due_date: dueDate,
      due_time: dueTime,
      list_id: actionPayload?.list_id || actionPayload?.listId || undefined,
    };
    const { data, error } = await insertWithMissingColumnFallback({
      client,
      table: "groceries",
      payload,
      select: "id, name, completed, list_id, due_date, due_time, created_at",
      optionalColumns: ["list_id", "due_date", "due_time"],
    });
    if (error) throw error;
    return data;
  }

  if (actionType === "log_health_daily") {
    const date = String(actionPayload?.date || todayISO);
    const payload: Record<string, unknown> = {
      user_id: userId,
      date,
      water_intake:
        Number.isFinite(Number(actionPayload?.waterIntake))
          ? Number(actionPayload.waterIntake)
          : undefined,
      mood:
        Number.isFinite(Number(actionPayload?.mood))
          ? Number(actionPayload.mood)
          : undefined,
      calories:
        Number.isFinite(Number(actionPayload?.calories))
          ? Number(actionPayload.calories)
          : undefined,
      mood_thought:
        typeof actionPayload?.moodThought === "string"
          ? actionPayload.moodThought
          : undefined,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await upsertWithMissingColumnFallback({
      client,
      table: "health_daily",
      payload,
      onConflict: "user_id,date",
      select: "id, user_id, date, water_intake, mood, calories, updated_at",
      optionalColumns: ["water_intake", "mood", "calories", "mood_thought", "updated_at"],
    });
    if (error) throw error;
    return data;
  }

  if (actionType === "add_food_entry") {
    const date = String(actionPayload?.date || todayISO);
    const name = String(actionPayload?.name || "Food entry").trim();
    const calories = Number(actionPayload?.calories || 0) || 0;
    const payload: Record<string, unknown> = {
      user_id: userId,
      date,
      name,
      calories,
      protein_grams:
        Number.isFinite(Number(actionPayload?.proteinGrams))
          ? Number(actionPayload.proteinGrams)
          : undefined,
      carbs_grams:
        Number.isFinite(Number(actionPayload?.carbsGrams))
          ? Number(actionPayload.carbsGrams)
          : undefined,
      fat_grams:
        Number.isFinite(Number(actionPayload?.fatGrams))
          ? Number(actionPayload.fatGrams)
          : undefined,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await insertWithMissingColumnFallback({
      client,
      table: "health_food_entries",
      payload,
      select:
        "id, user_id, date, name, calories, protein_grams, carbs_grams, fat_grams, created_at",
      optionalColumns: ["protein_grams", "carbs_grams", "fat_grams", "created_at"],
    });
    if (error) throw error;
    return data;
  }

  if (actionType === "update_task") {
    const taskId = String(actionPayload?.id || actionPayload?.task_id || "").trim();
    if (!taskId) throw new Error("Missing task id for update_task.");

    const updatePayload: Record<string, unknown> = {};
    if (actionPayload?.title !== undefined) {
      updatePayload.title = String(actionPayload.title || "").trim() || "Task";
    }
    if (actionPayload?.description !== undefined) {
      updatePayload.description =
        String(actionPayload.description || "").trim() || null;
    }
    if (actionPayload?.date !== undefined) {
      updatePayload.date = String(actionPayload.date || todayISO);
    }
    if (actionPayload?.time !== undefined) {
      updatePayload.time = String(actionPayload.time || defaultTime);
    }
    if (actionPayload?.priority !== undefined) {
      updatePayload.priority = resolvePriority(actionPayload.priority);
    }
    if (actionPayload?.completed !== undefined) {
      updatePayload.completed = Boolean(actionPayload.completed);
    }
    if (
      actionPayload?.durationMinutes !== undefined ||
      actionPayload?.duration_minutes !== undefined
    ) {
      const durationCandidate =
        actionPayload.duration_minutes ?? actionPayload.durationMinutes;
      updatePayload.duration_minutes =
        Number.isFinite(Number(durationCandidate))
          ? Number(durationCandidate)
          : undefined;
    }
    if (actionPayload?.category !== undefined) {
      updatePayload.category = String(actionPayload.category || "").trim() || null;
    }

    const { data, error } = await client
      .from("tasks")
      .update(updatePayload)
      .eq("id", taskId)
      .eq("user_id", userId)
      .select("id, title, description, priority, date, time, completed, created_at")
      .single();
    if (error) throw error;
    return data;
  }

  if (actionType === "complete_habit") {
    const habitId = String(actionPayload?.habit_id || actionPayload?.id || "").trim();
    if (!habitId) throw new Error("Missing habit id for complete_habit.");
    const date = String(actionPayload?.date || todayISO);
    const amount =
      Number.isFinite(Number(actionPayload?.amount))
        ? Number(actionPayload.amount)
        : 1;
    const { data, error } = await upsertWithMissingColumnFallback({
      client,
      table: "habit_completions",
      payload: {
        user_id: userId,
        habit_id: habitId,
        date,
        amount,
      },
      onConflict: "user_id,habit_id,date",
      select: "habit_id, date, amount",
      optionalColumns: ["amount"],
    });
    if (error) throw error;
    return data;
  }

  throw new Error(`Unsupported action_type: ${actionType}`);
};
