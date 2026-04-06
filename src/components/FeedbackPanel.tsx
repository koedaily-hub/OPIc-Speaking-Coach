"use client";

import React from "react";

interface FeedbackResult {
  transcript: string;
  wordCount: number;
  usedRandomWord: boolean;
  topicName?: string;
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

function getSuggestionLabel(text: string) {
  const t = text.toLowerCase();

  if (
    /\b(sentence|sentences|fragment|fragments|structure|complete sentence|complete sentences)\b/.test(
      t
    )
  ) {
    return "Sentence control";
  }

  if (
    /\b(link|linking|connector|connectors|transition|transitions|connect)\b/.test(
      t
    )
  ) {
    return "Linking";
  }

  if (/\b(detail|details|example|examples|support|supporting)\b/.test(t)) {
    return "Support";
  }

  if (
    /\b(clear|clarity|understand|meaning|easy to follow|listener|confus)\b/.test(
      t
    )
  ) {
    return "Clarity";
  }

  if (/\b(time|past|present|future|sequence|narration|narrative)\b/.test(t)) {
    return "Time control";
  }

  if (/\b(paragraph|organized|organization|develop|development)\b/.test(t)) {
    return "Organization";
  }

  if (/\b(filler|pause|pauses|fluency|hesitation|smooth)\b/.test(t)) {
    return "Fluency";
  }

  if (/\b(grammar|tense|tenses|verb|article|agreement)\b/.test(t)) {
    return "Grammar";
  }

  if (/\b(vocab|word choice|lexical|paraphrase)\b/.test(t)) {
    return "Vocabulary";
  }

  return "Focus";
}

function getSuggestionLabelTone(label: string) {
  switch (label) {
    case "Grammar":
      return "text-sky-700 bg-sky-50 ring-sky-100";
    case "Linking":
      return "text-emerald-700 bg-emerald-50 ring-emerald-100";
    case "Clarity":
      return "text-amber-700 bg-amber-50 ring-amber-100";
    case "Specificity":
    case "Support":
      return "text-violet-700 bg-violet-50 ring-violet-100";
    case "Vocabulary":
      return "text-fuchsia-700 bg-fuchsia-50 ring-fuchsia-100";
    case "Fluency":
      return "text-teal-700 bg-teal-50 ring-teal-100";
    case "Pronunciation":
      return "text-rose-700 bg-rose-50 ring-rose-100";
    case "Sentence control":
      return "text-indigo-700 bg-indigo-50 ring-indigo-100";
    case "Time control":
      return "text-cyan-700 bg-cyan-50 ring-cyan-100";
    case "Organization":
      return "text-blue-700 bg-blue-50 ring-blue-100";
    default:
      return "text-slate-700 bg-slate-100 ring-slate-200";
  }
}

export default function FeedbackPanel({
  result,
  suggestionsFooter,
}: FeedbackPanelProps) {
  if (!result) return null;

  const isOnTopic = result.topic_relevance?.status === "on_topic";
  const suggestions = result.opic_assessment?.improvement_points || [];
  const expressionFixes = result.expression_fixes || [];
  const [isCopied, setIsCopied] = React.useState(false);

  const reusablePhrasePatterns = React.useMemo(
    () => [
      /\bin my free time\b/gi,
      /\blook for\b/gi,
      /\bwaste of time\b/gi,
      /\bget better at\b/gi,
      /\btake part in\b/gi,
      /\bbe interested in\b/gi,
      /\bat the same time\b/gi,
      /\ba lot of\b/gi,
      /\bspend time (?:on|with)\b/gi,
      /\bend up [a-z]+\b/gi,
    ],
    []
  );

  const renderHighlightedSuggestedAnswer = React.useCallback(
    (text: string) => {
      if (!text) return text;

      const matches: Array<{ start: number; end: number }> = [];
      for (const pattern of reusablePhrasePatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(text);
        if (match && typeof match.index === "number") {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
          });
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
        if (selected.length >= 3) break;
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
            className="font-semibold text-emerald-800"
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
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Expression fixes
            </h4>

            {expressionFixes.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="hidden border-b border-slate-200 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid md:grid-cols-2 md:gap-6 sm:px-5">
                  <p>Original</p>
                  <p>Better version</p>
                </div>

                {expressionFixes.map((fix, idx) => (
                  <div
                    key={`${fix.original}-${idx}`}
                    className="grid grid-cols-1 gap-3 px-4 py-3 sm:px-5 sm:py-4 md:grid-cols-2 md:gap-6 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-200"
                  >
                    <div>
                      <p className="text-sm leading-relaxed text-slate-500">
                        {fix.original}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium leading-relaxed text-slate-900">
                        {fix.suggested}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No major expression issues found.
              </p>
            )}
          </section>

          <section>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Suggestions
            </h4>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              {suggestions.length ? (
                <ul className="space-y-2.5">
                  {suggestions.map((suggestion, i) => {
                    const label = getSuggestionLabel(suggestion);
                    const tone = getSuggestionLabelTone(label);

                    return (
                      <li
                        key={`imp-${i}`}
                        className="text-sm leading-relaxed text-slate-700"
                      >
                        <span
                          className={`mr-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}
                        >
                          {label}
                        </span>
                        <span>{suggestion}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  No suggestions available.
                </p>
              )}

              {suggestionsFooter && (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  {suggestionsFooter}
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
              <div className="flex flex-col">
                <div className="mb-3 flex min-h-[32px] items-center">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Transcript
                  </h4>
                </div>
                <div className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                    {result.transcript || "(empty)"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="mb-3 flex min-h-[32px] items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Suggested answer
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

                <div className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm leading-7 text-slate-700">
                    {renderHighlightedSuggestedAnswer(
                      result.suggested_transcript
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}