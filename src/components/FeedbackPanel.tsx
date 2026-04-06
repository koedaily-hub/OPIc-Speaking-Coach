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
  primaryLanguage?: "en" | "ko";
}

type TargetLevel = "IL" | "IM" | "IH" | "AL" | "Communication";
type TranslateLang = "en" | "vi" | "ko";

const TRANSLATE_LABEL: Record<TranslateLang, string> = {
  en: "English",
  vi: "Vietnamese",
  ko: "Korean",
};

function getTranslateOptions(primaryLanguage: "en" | "ko"): TranslateLang[] {
  if (primaryLanguage === "ko") return ["en", "vi"];
  return ["vi", "ko"];
}

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
  primaryLanguage = "en",
}: FeedbackPanelProps) {
  if (!result) return null;

  const isOnTopic = result.topic_relevance?.status === "on_topic";
  const target = (result.target ?? "IM") as TargetLevel;
  const suggestions = result.opic_assessment?.improvement_points || [];
  const opicTips = React.useMemo(
    () => buildOpicTips(target, result.transcript || "", suggestions),
    [target, result.transcript, suggestions]
  );
  const translateOptions = React.useMemo(
    () => getTranslateOptions(primaryLanguage),
    [primaryLanguage]
  );
  const [isCopied, setIsCopied] = React.useState(false);
  const [translateTo, setTranslateTo] = React.useState<"none" | TranslateLang>("none");
  const [translatedSuggestionText, setTranslatedSuggestionText] = React.useState("");
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [translationError, setTranslationError] = React.useState("");
  const prepTooltipRef = React.useRef<HTMLSpanElement | null>(null);
  const [isPrepTooltipOpen, setIsPrepTooltipOpen] = React.useState(false);
  const [prepTooltipSide, setPrepTooltipSide] = React.useState<"right" | "left" | "bottom">("right");
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

  const translatedSentenceRows = React.useMemo(
    () => splitIntoSentences(translatedSuggestionText),
    [translatedSuggestionText]
  );

  React.useEffect(() => {
    setTranslateTo("none");
    setTranslatedSuggestionText("");
    setIsTranslating(false);
    setTranslationError("");
  }, [result.suggested_transcript, primaryLanguage]);

  React.useEffect(() => {
    let cancelled = false;

    const runTranslation = async () => {
      if (translateTo === "none") {
        setTranslatedSuggestionText("");
        setTranslationError("");
        setIsTranslating(false);
        return;
      }

      if (!result.suggested_transcript?.trim()) {
        setTranslatedSuggestionText("");
        setTranslationError("No suggestion text available to translate.");
        setIsTranslating(false);
        return;
      }

      setIsTranslating(true);
      setTranslationError("");

      try {
        const form = new FormData();
        form.append("mode", "translate_prep");
        form.append("text", result.suggested_transcript);
        form.append("fromLang", primaryLanguage);
        form.append("toLang", translateTo);

        const res = await fetch("/api/evaluate", { method: "POST", body: form });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.detail || data?.error || "Translation failed");
        }

        if (!cancelled) {
          setTranslatedSuggestionText(String(data?.translatedText || "").trim());
          setTranslationError("");
        }
      } catch {
        if (!cancelled) {
          setTranslatedSuggestionText("");
          setTranslationError("Translation is unavailable right now.");
        }
      } finally {
        if (!cancelled) {
          setIsTranslating(false);
        }
      }
    };

    runTranslation();

    return () => {
      cancelled = true;
    };
  }, [translateTo, primaryLanguage, result.suggested_transcript]);

  React.useEffect(() => {
    if (!isPrepTooltipOpen || !prepTooltipRef.current || typeof window === "undefined") {
      return;
    }

    const rect = prepTooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    if (rect.right > viewportWidth - 10) {
      if (rect.left > 220) {
        setPrepTooltipSide("left");
      } else {
        setPrepTooltipSide("bottom");
      }
      return;
    }

    setPrepTooltipSide("right");
  }, [isPrepTooltipOpen]);

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
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span>Translate to</span>
                  <select
                    value={translateTo}
                    onChange={(e) => setTranslateTo(e.target.value as "none" | TranslateLang)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="none">Original only</option>
                    {translateOptions.map((code) => (
                      <option key={code} value={code}>
                        {TRANSLATE_LABEL[code]}
                      </option>
                    ))}
                  </select>
                </label>
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
            </div>

            {sentenceRows.length ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="hidden border-b border-slate-200 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid md:grid-cols-2 md:gap-6 sm:px-5">
                  <p className="text-center">Transcript</p>
                  <div className="inline-flex items-center justify-center gap-1.5 text-center">
                    <p>P.R.E.P suggestion</p>
                    <span
                      className="relative inline-flex items-center"
                      onMouseEnter={() => setIsPrepTooltipOpen(true)}
                      onMouseLeave={() => setIsPrepTooltipOpen(false)}
                      onFocus={() => setIsPrepTooltipOpen(true)}
                      onBlur={() => setIsPrepTooltipOpen(false)}
                    >
                      <button
                        type="button"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold normal-case text-slate-500 hover:border-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        aria-label="What is P.R.E.P"
                      >
                        i
                      </button>
                      <span
                        ref={prepTooltipRef}
                        role="tooltip"
                        className={[
                          "pointer-events-none absolute z-20 w-56 rounded-md bg-slate-900 px-3 py-2 text-[11px] normal-case leading-5 text-white shadow-lg transition",
                          prepTooltipSide === "right"
                            ? "left-full top-1/2 ml-2 -translate-y-1/2"
                            : prepTooltipSide === "left"
                            ? "right-full top-1/2 mr-2 -translate-y-1/2"
                            : "left-1/2 top-full mt-2 -translate-x-1/2",
                          isPrepTooltipOpen ? "opacity-100" : "opacity-0",
                        ].join(" ")}
                      >
                        P = Point<br />
                        R = Reason<br />
                        E = Example<br />
                        P = Point restated / Conclusion
                      </span>
                    </span>
                  </div>
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
                      {translateTo !== "none" && (
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {isTranslating
                            ? "Translating..."
                            : translationError
                            ? translationError
                            : translatedSentenceRows[idx] || "–"}
                        </span>
                      )}
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