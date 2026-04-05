type SupabaseLike = any;

type InsertUsageEventInput = {
  sessionId: string;
  eventName: string;
  word?: string;
  topic?: string;
  target?: string;
  metadata?: Record<string, unknown>;
};

export async function insertUsageEvent(
  supabase: SupabaseLike,
  input: InsertUsageEventInput
) {
  const { error } = await supabase.from("usage_events").insert({
    session_id: input.sessionId,
    event_name: input.eventName,
    word: input.word ?? null,
    topic: input.topic ?? null,
    target: input.target ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) throw error;
}

export async function touchSession(
  supabase: SupabaseLike,
  sessionId: string,
  options?: { recordIncrement?: number; feedbackIncrement?: number }
) {
  const recordIncrement = options?.recordIncrement ?? 0;
  const feedbackIncrement = options?.feedbackIncrement ?? 0;

  const { data: existing, error: existingError } = await supabase
    .from("sessions")
    .select("session_id, record_count, feedback_count")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (!existing) {
    const { error: insertError } = await supabase.from("sessions").insert({
      session_id: sessionId,
      record_count: recordIncrement,
      feedback_count: feedbackIncrement,
    });

    if (insertError) throw insertError;
    return;
  }

  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      last_seen_at: new Date().toISOString(),
      record_count: (existing.record_count ?? 0) + recordIncrement,
      feedback_count: (existing.feedback_count ?? 0) + feedbackIncrement,
    })
    .eq("session_id", sessionId);

  if (updateError) throw updateError;
}