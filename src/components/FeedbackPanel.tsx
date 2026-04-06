"use client";

import React from "react";

interface FeedbackResult {
  transcript: string;
  wordCount: number;
  usedRandomWord: boolean;
  topicName?: string;
  target?: TargetLevel;
  topic_relevance: {
    status: "on_topic" | "not_on_topic";
    reason: string;
  };
  expression_fixes: Array<{
    original: string;
    suggested: string;
  }>;
  opic_assessment: {
    improvement_points: string[];
  };
  suggested_transcript: string;
  encouragement: {
    quote: string;
    author: string;
  };
}

interface FeedbackPanelProps {
  result: FeedbackResult | null;
  suggestionsFooter?: React.ReactNode;
}

type TargetLevel = "IL" | "IM" | "IH" | "AL" | "Communication";

function splitIntoSentences(text: string): string[] {
  if (!text.trim()) return [];
  const matches = text.match(/[^.!?\n]+[.!?]?/g);
  if (!matches) return [text.trim()];
  return matches.map((part) => part.trim()).filter(Boolean);
}

function buildOpicTips(
  target: TargetLevel,
  transcript: string,
  improvements: string[]
) {
  const t = transcript.toLowerCase();
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const hasLinker = /\b(because|so|but|then|however|also)\b/.test(t);
  const hasReason = /\b(because|since|so)\b/.test(t);
  const hasExample = /\b(for example|for instance|such as|like when)\b/.test(t);
  const hasTime = /\b(yesterday|last|today|tomorrow|next|ago|when|before|after)\b/.test(t);
  const longestSentenceWords = Math.max(
    0,
    ...transcript
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.split(/\s+/).filter(Boolean).length)
  );

  const tips: string[] = [];
  const expectationByTarget: Record<TargetLevel, string> = {
    Communication:
      "For Communication, your answer should be easy to follow with clear sentence-to-sentence meaning.",
    IL: "For IL, focus on short complete sentences instead of fragments.",
    IM: "To sound more like IM, keep stable sentence-level speaking and add clear supporting detail.",
    IH: "For IH, your answer should feel more connected, with emerging narration or richer description.",
    AL: "At AL, your response should feel like a short paragraph with stronger support and clearer event timing.",
  };

  tips.push(expectationByTarget[target]);

  if (!hasReason) {
    tips.push(
      "In this response, add one clear reason after your main point (for example, start with because)."
    );
  } else if ((target === "IM" || target === "IH" || target === "AL") && !hasExample) {
    tips.push(
      "Add one short personal example to support your idea so it sounds more convincing for this target."
    );
  } else if (!hasLinker) {
    tips.push(
      "Use a simple transition like because, so, or but to connect your next idea more smoothly."
    );
  }

  if ((target === "IH" || target === "AL") && !hasTime) {
    tips.push(
      "Show when things happened more clearly by using past, present, or future time references."
    );
  } else if (longestSentenceWords >= 24) {
    tips.push(
      "Break one long sentence into two shorter complete sentences to make your message easier to follow."
    );
  }

  if (tips.length < 3 && wordCount < 20) {
    tips.push(
      "Add one more supporting sentence after your main idea so your answer does not feel too short."
    );
  }

  if (tips.length < 3 && improvements.length) {
    const fallback = improvements.find((item) => /\btime control\b/i.test(item))
      ? "Make the timing of events easier to follow with words like last year, these days, or after that."
      : improvements[0];
    tips.push(fallback);
  }

  return tips.slice(0, 3);
}

export default function FeedbackPanel({
  result,
  suggestionsFooter,
}: FeedbackPanelProps) {
  if (!result) return null;

  const isOnTopic = result.topic_relevance?.status === "on_topic";
  const target = (result.target ?? "IM") as TargetLevel;
  const suggestions = result.opic_assessment?.improvement_points || [];
  const opicTips = React.useMemo(
    () => buildOpicTips(target, result.transcript || "", suggestions),
    [target, result.transcript, suggestions]
  );
  const [isCopied, setIsCopied] = React.useState(false);
  const sentenceRows = React.useMemo(() => {
    const transcriptSentences = splitIntoSentences(result.transcript || "");
    const suggestedSentences = splitIntoSentences(result.suggested_transcript || "");
    const total = Math.max(transcriptSentences.length, suggestedSentences.length);

    if (total === 0) {
      return [] as Array<{ original: string; suggested: string; isChanged: boolean }>;
    }

    return Array.from({ length: total }, (_, idx) => {
      const original = transcriptSentences[idx] || "";
      const suggestedRaw = suggestedSentences[idx] || "";
      const suggested = suggestedRaw || original;
      const isChanged = original.trim() !== suggested.trim();

      return { original, suggested, isChanged };
    });
  }, [result.transcript, result.suggested_transcript]);

  const reusablePhrasePatterns = React.useMemo(
    () => [
      /\benjoyed the convenience\b/gi,
      /\bappreciate the benefits\b/gi,
      /\blook for\b/gi,
      /\bwaste of time\b/gi,
      /\bin my free time\b/gi,
      /\bget better at\b/gi,
      /\btake part in\b/gi,
      /\bbe interested in\b/gi,
      /\bat the same time\b/gi,
      /\bspend time (?:on|with)\b/gi,
      /\bend up [a-z]+\b/gi,
      /\bcut down on\b/gi,
      /\bdeal with\b/gi,
      /\bfigure out\b/gi,
      /\bwork on\b/gi,
      /\bbe good for\b/gi,
    ],
    []
  );

  const renderHighlightedSuggestedAnswer = React.useCallback(
    (text: string) => {
      if (!text) return text;

      const matches: Array<{ start: number; end: number }> = [];
      for (const pattern of reusablePhrasePatterns) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null = pattern.exec(text);
        while (match) {
          if (typeof match.index === "number") {
            const wordCount = match[0].trim().split(/\s+/).length;
            if (wordCount >= 2 && wordCount <= 4) {
              matches.push({
                start: match.index,
                end: match.index + match[0].length,
              });
            }
          }
          match = pattern.exec(text);
        }
      }

      const selected: Array<{ start: number; end: number }> = [];
      for (const range of matches.sort(
        (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start)
      )) {
        const overlaps = selected.some(
          (picked) => !(range.end <= picked.start || range.start >= picked.end)
        );
        if (!overlaps) selected.push(range);
        if (selected.length >= 5) break;
      }

      if (!selected.length) return text;

      const nodes: React.ReactNode[] = [];
      let cursor = 0;

      selected.forEach((range, idx) => {
        if (range.start > cursor) {
          nodes.push(
            <React.Fragment key={`plain-${idx}`}>
              {text.slice(cursor, range.start)}
            </React.Fragment>
          );
        }

        nodes.push(
          <span
            key={`hl-${idx}`}
            className="font-semibold text-emerald-700"
          >
            {text.slice(range.start, range.end)}
          </span>
        );

        cursor = range.end;
      });

      if (cursor < text.length) {
        nodes.push(
          <React.Fragment key="plain-tail">{text.slice(cursor)}</React.Fragment>
        );
      }

      return nodes;
    },
    [reusablePhrasePatterns]
  );

  const handleCopySuggestedAnswer = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result.suggested_transcript || "");
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1200);
    } catch {
      setIsCopied(false);
    }
  }, [result.suggested_transcript]);

  return (
    <div id="ai-feedback-section" className="mt-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="mb-5 text-lg font-semibold tracking-tight text-slate-900">
          AI Feedback
        </h3>

        <div className="space-y-5">
          <section>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Quick summary
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total words
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-800">
                  {result.wordCount}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Random word used
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-800">
                  {result.usedRandomWord ? "Yes" : "No"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Topic fit
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-800">
                  {isOnTopic ? "On topic" : "Needs alignment"}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm leading-relaxed text-slate-600">
                {result.topic_relevance?.reason}
              </p>
            </div>
          </section>

          <section>
            <div className="mb-3 flex min-h-[32px] items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Transcript Improvement Suggestions
              </h4>
              <button
                type="button"
                onClick={handleCopySuggestedAnswer}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                aria-label={isCopied ? "Copied" : "Copy suggested answer"}
                title={isCopied ? "Copied" : "Copy"}
              >
                {isCopied ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m5 13 4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                  </svg>
                )}
              </button>
            </div>

            {sentenceRows.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="hidden border-b border-slate-200 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid md:grid-cols-2 md:gap-6 sm:px-5">
                  <p>Transcript</p>
                  <p>PREP Suggestions</p>
                </div>
                {sentenceRows.map((row, idx) => (
                  <div
                    key={`sentence-row-${idx}`}
                    className="grid grid-cols-1 gap-3 px-4 py-3 sm:px-5 sm:py-4 md:grid-cols-2 md:gap-6 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-200"
                  >
                    <p className="text-sm leading-relaxed text-slate-500">
                      {row.original || "–"}
                    </p>
                    <p
                      className={[
                        "text-sm leading-relaxed",
                        row.isChanged ? "font-medium text-slate-900" : "text-slate-700",
                      ].join(" ")}
                    >
                      {renderHighlightedSuggestedAnswer(row.suggested || row.original || "–")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm leading-7 text-slate-500">–</p>
              </div>
            )}

            {suggestionsFooter && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                {suggestionsFooter}
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              OPIc Tips
            </h4>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              {opicTips.length ? (
                <ul className="space-y-2.5">
                  {opicTips.map((tip, i) => (
                    <li key={`tip-${i}`} className="text-sm leading-relaxed text-slate-700">
                      <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                        {i + 1}
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  No OPIc tips available.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}