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

export default function FeedbackPanel({
  result,
  suggestionsFooter,
}: FeedbackPanelProps) {
  if (!result) return null;

  const isOnTopic = result.topic_relevance?.status === "on_topic";
  const suggestions = result.opic_assessment?.improvement_points || [];
  const expressionFixes = result.expression_fixes || [];
  const [isCopied, setIsCopied] = React.useState(false);

  const inferSuggestionLabel = React.useCallback((suggestion: string) => {
    const text = suggestion.toLowerCase();

    if (/grammar|tense|article|subject-verb|agreement/.test(text)) return "Grammar";
    if (/link|transition|connect|connector/.test(text)) return "Linking";
    if (/clear|clarity|understand|confus/.test(text)) return "Clarity";
    if (/detail|example|specific|context/.test(text)) return "Specificity";
    if (/vocab|word choice|lexical|paraphrase/.test(text)) return "Vocabulary";
    if (/fluency|flow|hesitat|pause|smooth/.test(text)) return "Fluency";
    if (/pronunciation|stress|intonation/.test(text)) return "Pronunciation";

    return "Focus";
  }, []);

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
                      <p className="text-sm leading-relaxed text-slate-600">
                        <span className="underline decoration-slate-400 decoration-2 underline-offset-2">
                          {fix.original}
                        </span>
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
                <ul className="space-y-2">
                  {suggestions.map((suggestion, i) => (
                    <li
                      key={`imp-${i}`}
                      className="text-sm leading-relaxed text-slate-700"
                    >
                      <span className="font-semibold text-slate-900">
                        {inferSuggestionLabel(suggestion)}:
                      </span>{" "}
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No suggestions available.</p>
              )}

              {suggestionsFooter && (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  {suggestionsFooter}
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Transcript
                </h4>
                <div className="h-full rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                    {result.transcript || "(empty)"}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
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

                <div className="h-full rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm leading-7 text-slate-700">
                    {result.suggested_transcript}
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