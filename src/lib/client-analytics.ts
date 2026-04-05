type UsageEventName =
  | "record_finished"
  | "ai_feedback_requested"
  | "ai_feedback_received"
  | "feedback_helpful"
  | "feedback_not_helpful"
  | "report_issue_submitted";

type SendUsageEventInput = {
  sessionId: string;
  eventName: UsageEventName;
  word?: string;
  topic?: string;
  target?: string;
  metadata?: Record<string, unknown>;
};

type SendFeedbackReactionInput = {
  feedbackEventId: string;
  sessionId: string;
  helpful: boolean;
  reason?: string;
};

type SendIssueReportInput = {
  sessionId: string;
  type: "bug" | "feature_request" | "ai_quality";
  message: string;
  page?: string;
  context?: Record<string, unknown>;
  email?: string;
};

export async function sendUsageEvent(input: SendUsageEventInput) {
  await fetch("/api/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function sendFeedbackReaction(input: SendFeedbackReactionInput) {
  await fetch("/api/feedback-reaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function sendIssueReport(input: SendIssueReportInput) {
  await fetch("/api/report-issue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}