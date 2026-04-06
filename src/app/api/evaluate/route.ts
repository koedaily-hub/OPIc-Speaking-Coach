import { NextResponse } from "next/server";
import topics from "@/data/topics.json";
import { FAMOUS_QUOTES } from "@/data/famousQuotes";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { insertUsageEvent, touchSession } from "@/lib/server-analytics";
import {
  normalizeImprovementPoints,
  OPIC_RUBRIC,
  SUGGESTED_ANSWER_RULES,
  buildRubricPromptBlock,
} from "@/lib/opic-rubric";

export const runtime = "nodejs";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_CHAT_MODEL = "llama-3.3-70b-versatile";
const GROQ_STT_MODEL = "whisper-large-v3-turbo";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

type TargetLevel = "IL" | "IM" | "IH" | "AL" | "Communication";
type Lang = "en" | "ko";

type TopicItem = {
  id: string;
  name: string;
  emoji: string;
};

type PronunciationCandidate = {
  token: string;
  start?: number;
  end?: number;
};

const TOPICS = topics as TopicItem[];

function countWords(text: string) {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

function normalizeToken(token: string) {
  return token.toLowerCase().replace(/[^a-z]/g, "");
}

function buildWordFamilyForms(baseWord: string) {
  const base = normalizeToken(baseWord);
  const forms = new Set<string>();
  if (!base) return forms;

  forms.add(base);

  // Common inflections
  forms.add(`${base}s`);
  forms.add(`${base}es`);
  forms.add(`${base}ed`);
  forms.add(`${base}ing`);
  forms.add(`${base}er`);

  if (base.endsWith("e")) {
    const stem = base.slice(0, -1);
    if (stem.length >= 3) {
      forms.add(`${stem}ing`);
      forms.add(`${stem}ed`);
      forms.add(`${stem}er`);
    }
  }

  if (base.endsWith("y") && base.length > 3) {
    const stem = base.slice(0, -1);
    forms.add(`${stem}ies`);
    forms.add(`${stem}ied`);
  }

  // Lightweight derivational variants
  forms.add(`${base}ion`);
  forms.add(`${base}tion`);
  forms.add(`${base}ment`);
  forms.add(`${base}al`);
  forms.add(`${base}ity`);

  // Example: operate -> operation
  if (base.endsWith("ate") && base.length > 4) {
    const stem = base.slice(0, -3);
    forms.add(`${stem}ation`);
    forms.add(`${stem}ations`);
  }

  return forms;
}

function containsRandomWord(transcript: string, randomWord: string) {
  if (!transcript || !randomWord) return false;

  const rawWord = randomWord.toLowerCase().trim();

  // Multi-word phrase: exact-ish safe boundary match
  if (rawWord.includes(" ")) {
    return new RegExp(
      `\\b${rawWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    ).test(transcript.toLowerCase());
  }

  const familyForms = buildWordFamilyForms(rawWord);
  if (!familyForms.size) return false;

  const tokens = transcript
    .toLowerCase()
    .split(/\s+/)
    .map((token) => normalizeToken(token))
    .filter(Boolean);

  return tokens.some((token) => familyForms.has(token));
}

function resolveTopicName(topicId: string) {
  return TOPICS.find((t) => t.id === topicId)?.name ?? topicId;
}

function pickRandomQuote() {
  return FAMOUS_QUOTES[Math.floor(Math.random() * FAMOUS_QUOTES.length)];
}

function extractWords(stt: any): PronunciationCandidate[] {
  const words = Array.isArray(stt?.words) ? stt.words : [];
  return words
    .map((w: any) => ({
      token: String(w?.word ?? "").trim(),
      start: typeof w?.start === "number" ? w.start : 0,
      end: typeof w?.end === "number" ? w.end : 0,
    }))
    .filter((w: PronunciationCandidate) => w.token.length > 0);
}

function inferInternalSignals(transcript: string) {
  const trimmed = transcript.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const hasLinkers = /\b(because|so|but|then|after that|for example|however|also|therefore)\b/i.test(
    transcript
  );
  const hasReasonMarker = /\b(because|since|so)\b/i.test(transcript);
  const hasExampleMarker = /\b(for example|for instance|like when|such as)\b/i.test(
    transcript
  );
  const hasTimeMarkers = /\b(yesterday|last|today|tomorrow|next|ago|when|before|after)\b/i.test(
    transcript
  );
  const hasFillers = /(^|\s)(uh|um|uhm|er|ah)(\s|$)/i.test(
    transcript.toLowerCase()
  );
  const sentenceCount = trimmed
    ? trimmed.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length
    : 0;
  const sentenceWordCounts = trimmed
    ? trimmed
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.split(/\s+/).filter(Boolean).length)
    : [];
  const longestSentenceWords = sentenceWordCounts.length
    ? Math.max(...sentenceWordCounts)
    : 0;
  const hasParagraphLikeFlow = wordCount >= 60 && hasLinkers;

  return {
    wordCount,
    hasLinkers,
    hasReasonMarker,
    hasExampleMarker,
    hasTimeMarkers,
    hasFillers,
    sentenceCount,
    longestSentenceWords,
    hasParagraphLikeFlow,
  };
}

function buildContextAwareFallback(
  target: TargetLevel,
  transcript: string
): string[] {
  const suggestions: string[] = [];
  const signals = inferInternalSignals(transcript);

  if (signals.wordCount > 0 && signals.wordCount < 20) {
    suggestions.push(
      "Add one more short supporting detail after your main point so your answer feels complete."
    );
  }

  if (!signals.hasLinkers) {
    suggestions.push(
      "Use one simple transition like because, so, or but to connect your next idea."
    );
  }

  if (!signals.hasReasonMarker) {
    suggestions.push(
      "Add one clear reason after your point (for example, start with because) so your opinion sounds supported."
    );
  }

  if ((target === "IM" || target === "IH" || target === "AL") && !signals.hasExampleMarker) {
    suggestions.push(
      "Add one short personal example (for example, a real situation from your life) to support your main idea."
    );
  }

  if (signals.longestSentenceWords >= 24) {
    suggestions.push(
      "Break one long unclear sentence into two shorter complete sentences so the listener can follow more easily."
    );
  }

  if (signals.hasFillers) {
    suggestions.push(
      "Slow down slightly and pause more naturally to reduce filler words."
    );
  }

  if ((target === "IH" || target === "AL") && !signals.hasTimeMarkers) {
    suggestions.push(
      "Use clearer time markers (like last year, these days, or after that) when describing experiences."
    );
  }

  if (target === "AL" && signals.wordCount < 50) {
    suggestions.push(
      "Develop your answer as a short paragraph: point, reason, one example, then a short closing point."
    );
  }

  if ((target === "IH" || target === "AL") && !signals.hasParagraphLikeFlow) {
    suggestions.push(
      "Connect your ideas into a short flow instead of separate sentence blocks so the response sounds more developed."
    );
  }

  if ((target === "IH" || target === "AL") && /\bbut\b/i.test(transcript)) {
    suggestions.push(
      "Expand the contrast in your answer with one more supporting explanation so the listener can follow your reasoning more easily."
    );
  }

  if (target === "AL" && signals.wordCount >= 25 && signals.wordCount < 70) {
    suggestions.push(
      "After your example, add one more supporting explanation so your answer sounds fully developed for this level."
    );
  }

  if (target === "AL" && !signals.hasTimeMarkers) {
    suggestions.push(
      "Use clearer sequencing or framing so your ideas sound more organized and paragraph-like."
    );
  }

  if (target === "IL" && signals.wordCount > 0 && signals.sentenceCount <= 1) {
    suggestions.push(
      "Break your answer into short complete sentences instead of one long unclear sentence."
    );
  }

  return suggestions;
}

function looksTooScripted(text: string) {
  const t = text.toLowerCase();

  const suspiciousPatterns = [
    /first of all/i,
    /moreover/i,
    /in conclusion/i,
    /from my perspective/i,
    /it is worth noting that/i,
    /on the other hand/i,
    /to begin with/i,
    /as a result/i,
  ];

  return suspiciousPatterns.some((rx) => rx.test(t));
}

function stripOverlyFormalOpeners(text: string) {
  return text
    .replace(/\bfirst of all,?\s*/gi, "")
    .replace(/\bmoreover,?\s*/gi, "")
    .replace(/\bin conclusion,?\s*/gi, "")
    .replace(/\bfrom my perspective,?\s*/gi, "")
    .replace(/\bit is worth noting that\s*/gi, "")
    .replace(/\bto begin with,?\s*/gi, "")
    .trim();
}

function normalizeSuggestedTranscript(target: TargetLevel, text: string) {
  let cleaned = text.trim();
  if (!cleaned) return cleaned;

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (target === "IL" && sentences.length > 4) {
    cleaned = sentences.slice(0, 4).join(" ");
  }

  if (target === "IM" && sentences.length > 5) {
    cleaned = sentences.slice(0, 5).join(" ");
  }

  if ((target === "IL" || target === "IM") && looksTooScripted(cleaned)) {
    cleaned = stripOverlyFormalOpeners(cleaned);
  }

  // Keep lower targets realistic and not essay-like
  if (target === "IL") {
    cleaned = cleaned.replace(/\bhowever\b/gi, "but");
    cleaned = cleaned.replace(/\btherefore\b/gi, "so");
    cleaned = cleaned.replace(/\bmoreover\b/gi, "also");
  }

  return cleaned.trim();
}

function classifySuggestionBucket(text: string) {
  const t = text.toLowerCase();

  if (
    /\b(sentence|sentences|fragment|fragments|structure|complete sentence|complete sentences)\b/i.test(
      t
    )
  ) {
    return "sentence";
  }

  if (
    /\b(link|linking|connector|connectors|transition|transitions|connect)\b/i.test(
      t
    )
  ) {
    return "linking";
  }

  if (/\b(detail|details|example|examples|support|supporting)\b/i.test(t)) {
    return "detail";
  }

  if (
    /\b(clear|clarity|understand|meaning|easy to follow|listener)\b/i.test(t)
  ) {
    return "clarity";
  }

  if (
    /\b(time|past|present|future|sequence|narration|narrative)\b/i.test(t)
  ) {
    return "time";
  }

  if (/\b(filler|pause|pauses|fluency|hesitation)\b/i.test(t)) {
    return "fluency";
  }

  if (/\b(paragraph|organized|organization|develop|development)\b/i.test(t)) {
    return "organization";
  }

  return "other";
}

function dedupeImprovementPoints(
    points: string[],
    target?: TargetLevel
  ) {
    const result: string[] = [];
    const seenBuckets = new Set<string>();

    const preferredOrderForHighTargets =
      target === "IH" || target === "AL"
        ? ["organization", "time", "detail", "linking", "clarity", "sentence", "fluency", "other"]
        : ["sentence", "linking", "detail", "clarity", "time", "fluency", "organization", "other"];

    const sorted = [...points].sort((a, b) => {
      const aBucket = classifySuggestionBucket(a);
      const bBucket = classifySuggestionBucket(b);
      return (
        preferredOrderForHighTargets.indexOf(aBucket) -
        preferredOrderForHighTargets.indexOf(bBucket)
      );
    });

    for (const point of sorted) {
      const cleaned = point.trim();
      if (!cleaned) continue;

      const bucket = classifySuggestionBucket(cleaned);

      if (bucket !== "other") {
        if (seenBuckets.has(bucket)) continue;
        seenBuckets.add(bucket);
      }

      result.push(cleaned);
      if (result.length >= 3) break;
    }

    return result;
  }

async function callGroqJSON<T>(system: string, user: string): Promise<T> {
  if (!GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY in environment variables");
  }

  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_CHAT_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    const error: any = new Error(`Groq chat error ${res.status}: ${detail}`);
    error.status = res.status;
    throw error;
  }

  const completion = await res.json();
  const text = completion?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Groq returned empty response");
  }

  return JSON.parse(text) as T;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const mode = String(form.get("mode") || "full");

    const audio = form.get("audio");
    const word = String(form.get("word") || "").trim();
    const topicId = String(form.get("topic") || "").trim();
    const lang = (String(form.get("lang") || "en") as Lang) || "en";
    const target = (String(form.get("target") || "IM") as TargetLevel) || "IM";
    const sessionId = String(form.get("sessionId") || "").trim();

    const rubric = OPIC_RUBRIC[target];
    const answerStyle = SUGGESTED_ANSWER_RULES[target];
    const topicName = resolveTopicName(topicId);

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio" }, { status: 400 });
    }

    if (!word) {
      return NextResponse.json(
        { error: "Missing random word" },
        { status: 400 }
      );
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY in environment variables" },
        { status: 500 }
      );
    }

    // ---------- A) TRANSCRIBE WITH GROQ ----------
    const mime = audio.type || "audio/wav";
    const file = new File([audio], "audio.wav", { type: mime });

    const sttForm = new FormData();
    sttForm.append("model", GROQ_STT_MODEL);
    sttForm.append("file", file);
    sttForm.append("language", lang === "ko" ? "ko" : "en");
    sttForm.append("response_format", "verbose_json");
    sttForm.append("timestamp_granularities[]", "word");

    const sttRes = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: sttForm,
    });

    if (!sttRes.ok) {
      const detail = await sttRes.text();
      const error: any = new Error(
        `Groq transcription error ${sttRes.status}: ${detail}`
      );
      error.status = sttRes.status;
      throw error;
    }

    const stt = await sttRes.json();

    const transcript = String((stt as any)?.text || "").trim();
    const extractedWords = extractWords(stt);

    // ---------- B) PRE-COMPUTE ----------
    const wordCount = countWords(transcript);
    const usedRandomWord = containsRandomWord(transcript, word);
    const internalSignals = inferInternalSignals(transcript);

    if (mode === "stt") {
      return NextResponse.json({
        ok: true,
        transcript,
        words: extractedWords,
        meta: {
          mime,
          word,
          topicId,
          topicName,
          lang,
          target,
          wordCount,
          usedRandomWord,
        },
      });
    }

    const randomQuote = pickRandomQuote();

    // ---------- C) GROQ GRADE WITH JSON OUTPUT ----------
    const system = `
You are an ACTFL/OPIc-style speaking feedback assistant.

Your job:
- evaluate the user's response against the requested target level
- keep feedback practical, target-aware, and honest
- do NOT reward memorized or unnatural scripted language
- do NOT give generic advice like "practice more"

Return ONLY valid JSON with this exact shape:
{
  "topic_relevance": { "status": "on_topic" | "not_on_topic", "reason": string },
  "expression_fixes": [{ "original": string, "suggested": string }],
  "opic_assessment": {
    "improvement_points": string[]
  },
  "suggested_transcript": string,
  "encouragement": { "quote": string, "author": string }
}

Rules:
- topic_relevance.reason must be exactly 1 sentence in English
- expression_fixes should focus on meaningful spoken-expression improvements
- improvement_points must be specific, actionable, and matched to the target level
- suggested_transcript must sound natural, not memorized or theatrical
 - suggested_transcript should follow PREP as a natural framework:
   Point -> Reason -> Example -> Point
- if the target is lower, do not force advanced output
- if the target is higher, encourage the next realistic step, not unrealistic perfection
- do not give vague advice such as "practice more", "use better vocabulary", or "speak naturally"
- each improvement point should tell the learner exactly what to focus on next

- Preserve the speaker's original meaning as closely as possible for ALL target levels.
- Do not introduce a new idea, motive, reason, or emotional meaning that is not already supported by the transcript.
- Prefer a faithful correction over a more creative rewrite.
- The suggested answer should sound more natural and correct, but it must stay semantically close to what the learner was trying to say.
- If the original meaning is unclear, minimally clarify it instead of replacing it with a different meaning.
- Do not over-interpret the learner's intention.
- Do not invent extra details, reasons, or examples unless they are already implied by the transcript.
- For IH, prefer a more connected and developed response with emerging narration or richer description, but keep it realistic and not over-polished.
- For AL, prefer a short paragraph-like response with a clear general statement, a personal example, and one supporting explanation.
- For IH and AL, stronger organization, support, and flow matter more than just correcting grammar.
- For IH, you may make the answer more connected and slightly more developed, but do not add multiple new supporting ideas that were not present in the transcript.
- Keep the suggested answer close to the learner's original content, with only light development.
- For IH, add at most one light supporting idea beyond the original transcript, and only if it feels naturally implied.
 - Apply PREP across all targets, but calibrate by level:
   * IL/IM: simple, lighter PREP with short clear sentences
   * IH/AL: more developed PREP with smoother linking and clearer support
 - Keep PREP natural and learner-friendly; do not make it sound scripted.
`;

    const user = `
${buildRubricPromptBlock(target)}

Additional style rules for this target:
${answerStyle}

Input:
Language: ${lang}
Topic: ${topicName}
Random word: ${word}
Transcript: """${transcript}"""
Word count: ${wordCount}
Random word used: ${usedRandomWord}

Observed transcript signals:
- Word count: ${internalSignals.wordCount}
- Has linking words: ${internalSignals.hasLinkers}
- Has time markers: ${internalSignals.hasTimeMarkers}
- Has paragraph-like flow: ${internalSignals.hasParagraphLikeFlow}

Instructions:
1. Judge the answer against the target level above.
2. Give 3 short improvement points that directly match this target.
3. If the answer sounds unnatural or memorized, avoid rewarding that style.
4. The suggested answer should be a better version for THIS target level, not a generic ideal answer.
5. Keep the corrected answer realistic for a learner at this target.
6. Make the improvement points reflect this coaching focus:
${rubric.coachingFocus.map((x) => `- ${x}`).join("\n")}
7. Use this fixed encouragement quote exactly:
"${randomQuote.text}" — ${randomQuote.author}
8. Keep the suggested answer semantically close to the learner's original meaning.
9. Correct the language, but do not replace the learner's idea with a different idea.
10. If the target is IH or AL, make the suggested answer feel more connected and developed, not just a list of corrected sentences.
11. If the target is AL, prefer a short paragraph-like response with a general point, a personal example, and clearer supporting explanation.
 12. Organize suggested_transcript with a natural PREP flow (Point -> Reason -> Example -> Point) while keeping wording realistic for this target level.
 13. Keep PREP lightweight for lower levels and more developed for higher levels; avoid robotic template language.

`;

    const graded = await callGroqJSON<any>(system, user);

    const rawImprovementPoints = Array.isArray(
      graded?.opic_assessment?.improvement_points
    )
      ? graded.opic_assessment.improvement_points.filter(
          (p: unknown): p is string => typeof p === "string" && !!p.trim()
        )
      : [];

    const contextAwareFallback = buildContextAwareFallback(target, transcript);

    const normalizedPoints = normalizeImprovementPoints(target, [
      ...rawImprovementPoints,
      ...contextAwareFallback,
    ]);

    let improvementPoints = dedupeImprovementPoints(normalizedPoints, target);

    if (improvementPoints.length < 3) {
      improvementPoints = dedupeImprovementPoints(
        [...improvementPoints, ...OPIC_RUBRIC[target].suggestionFallbacks],
        target
      );
    }

    let normalizedSuggested = normalizeSuggestedTranscript(
      target,
      String(graded?.suggested_transcript || "")
    );

    if ((target === "IL" || target === "IM") && looksTooScripted(normalizedSuggested)) {
      normalizedSuggested = stripOverlyFormalOpeners(normalizedSuggested);
      normalizedSuggested = normalizeSuggestedTranscript(target, normalizedSuggested);
    }

    const responsePayload = {
      transcript,
      wordCount,
      usedRandomWord,
      topicName,
      target,
      ...graded,
      opic_assessment: {
        ...(graded?.opic_assessment || {}),
        improvement_points: improvementPoints,
      },
      suggested_transcript: normalizedSuggested,
      encouragement: {
        quote: randomQuote.text,
        author: randomQuote.author,
      },
    };

    let feedbackEventId: string | null = null;

    if (sessionId) {
      try {
        const supabase = getSupabaseServerClient();

        const { data: insertedFeedback, error: feedbackInsertError } =
          await supabase
            .from("feedback_events")
            .insert({
              session_id: sessionId,
              word,
              topic: topicId,
              target,
              transcript,
              feedback_output: responsePayload,
            })
            .select("id")
            .single();

        if (feedbackInsertError) {
          throw feedbackInsertError;
        }

        feedbackEventId = insertedFeedback?.id ?? null;

        await insertUsageEvent(supabase, {
          sessionId,
          eventName: "ai_feedback_received",
          word,
          topic: topicId,
          target,
          metadata: {
            feedbackEventId,
            wordCount,
            usedRandomWord,
          },
        });

        await touchSession(supabase, sessionId, { feedbackIncrement: 1 });
      } catch (analyticsError) {
        console.error("[analytics] evaluate tracking failed", analyticsError);
      }
    }

    return NextResponse.json({
      feedbackEventId,
      ...responsePayload,
    });
  } catch (err: any) {
    console.error(err);

    const status = Number(err?.status) || 500;
    const isQuotaError =
      status === 429 ||
      err?.code === "insufficient_quota" ||
      err?.type === "insufficient_quota" ||
      err?.code === "RESOURCE_EXHAUSTED" ||
      err?.code === "rate_limit_exceeded";

    if (isQuotaError) {
      return NextResponse.json(
        {
          error: "Groq quota exceeded",
          detail:
            "Groq API is currently out of quota or has exceeded the rate limit. Please check your Groq API usage or try again later.",
          code: err?.code || "rate_limit_exceeded",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Evaluate failed", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}