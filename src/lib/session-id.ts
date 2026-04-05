export function getOrCreateSessionId() {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem("sessionId");
  if (existing) return existing;

  const sessionId = `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  window.localStorage.setItem("sessionId", sessionId);
  return sessionId;
}