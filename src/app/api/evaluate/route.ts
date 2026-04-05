import { NextResponse } from "next/server";
import topics from "@/data/topics.json";
import { FAMOUS_QUOTES } from "@/data/famousQuotes";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { insertUsageEvent, touchSession } from "@/lib/server-analytics";

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

// ✅ (Optional) Rubric rút gọn: bạn có thể nâng cấp sau
const RUBRIC = {
  IL: "Intermediate Low: simple phrases and short sentences with frequent hesitation.",
  IM: "Intermediate Mid: sentence-level, limited linking, time frames may be unclear.",
  IH: "Intermediate High: stronger sentence control, some connected ideas, occasional breakdown.",
  AL: "Advanced Low: emerging paragraphs, narrative with clear time frames.",
  Communication: "Focus on comprehensibility and clarity over form.",
};

const TOPICS = topics as TopicItem[];

const TARGET_TIPS: Record<TargetLevel, string[]> = {
  IL: [
    "Use short complete sentences with one clear idea each.",
    "Add basic connectors like and/but/because between ideas.",
    "Keep pronunciation clear and avoid over-complicated grammar.",
  ],
  IM: [
    "Expand each point with one reason and one specific detail.",
    "Control present vs past time clearly in your response.",
    "Use transition words to connect sentences smoothly.",
  ],
  IH: [
    "Link ideas into a coherent mini-story, not isolated sentences.",
    "Add personal reactions and comparisons for richer content.",
    "Paraphrase repeated words to sound more natural.",
  ],
  AL: [
    "Build paragraph-like responses with opening, development, closing.",
    "Use precise time frames and sequencing in narratives.",
    "Add depth with context, contrast, and consequence.",
  ],
  Communication: [
    "Prioritize clarity with simple, easy-to-follow phrasing.",
    "Use signposting language so listeners can track your ideas.",
    "When stuck, restart with a shorter sentence to avoid breakdowns.",
  ],
};

function countWords(text: string) {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

function containsRandomWord(transcript: string, randomWord: string) {
  if (!transcript || !randomWord) return false;
  const t = transcript.toLowerCase();
  const w = randomWord.toLowerCase().trim();
  // match nguyên từ (word boundary)
  return new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(t);
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
    throw new Error(`Groq chat error ${res.status}: ${detail}`);
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
    const mode = String(form.get("mode") || "full"); // "stt" | "full"

    const audio = form.get("audio");
    const word = String(form.get("word") || "").trim();
    const topicId = String(form.get("topic") || "").trim();
    const lang = (String(form.get("lang") || "en") as Lang) || "en";
    const target = (String(form.get("target") || "IM") as TargetLevel) || "IM";
    const sessionId = String(form.get("sessionId") || "").trim();
    const topicName = resolveTopicName(topicId);

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio" }, { status: 400 });
    }
    if (!word) {
      return NextResponse.json({ error: "Missing random word" }, { status: 400 });
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
      throw new Error(`Groq transcription error ${sttRes.status}: ${detail}`);
    }

    const stt = await sttRes.json();

    const transcript = String((stt as any)?.text || "").trim();
    const extractedWords = extractWords(stt);

    // ---------- B) PRE-COMPUTE (anti-hallucination) ----------
    const wordCount = countWords(transcript);
    const usedRandomWord = containsRandomWord(transcript, word);

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
You are an ACTFL-style OPIc feedback assistant.
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
- Keep output concise.
- topic_relevance.reason must be exactly 1 sentence and in English.
- Use only provided transcript and signals.
- Skip pronunciation analysis section.
- expression_fixes: include all clear vocabulary/grammar/expression mistakes you can find in the transcript (not just one).
- opic_assessment.improvement_points: exactly 3 short, practical OPIc-focused tips.
- improvement_points must be target-specific and actionable (avoid generic advice like "practice more").
- suggested_transcript: give an improved sample answer suited to learner level; if current answer is already very good, write a short praise sentence instead of rewriting.
- encouragement must use EXACTLY the quote/author provided in the input section "Fixed encouragement quote".
`;

    const user = `
Input:
Language: ${lang}
Target: ${target}
Rubric: ${RUBRIC[target]}
Topic: ${topicName} (id: ${topicId})
Random word: ${word}
word_count: ${wordCount}
random_word_used: ${usedRandomWord}
Transcript: """${transcript}"""

Target-specific guidance (must align with this target):
${TARGET_TIPS[target].map((tip, idx) => `${idx + 1}. ${tip}`).join("\n")}

Fixed encouragement quote (must use exactly this):
"${randomQuote.text}" — ${randomQuote.author}
`;

    const graded = await callGroqJSON<any>(system, user);
    const modelPoints = Array.isArray(graded?.opic_assessment?.improvement_points)
      ? graded.opic_assessment.improvement_points.filter((p: unknown) => typeof p === "string" && p.trim())
      : [];
    const improvementPoints = (modelPoints.length ? modelPoints : TARGET_TIPS[target]).slice(0, 3);

    // ---------- D) Return to UI ----------
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
      encouragement: {
        quote: randomQuote.text,
        author: randomQuote.author,
      },
    };

    let feedbackEventId: string | null = null;

    if (sessionId) {
      try {
        const supabase = getSupabaseServerClient();

        const { data: insertedFeedback, error: feedbackInsertError } = await supabase
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
            "Groq API hiện đã hết quota hoặc vượt giới hạn rate limit. Vui lòng kiểm tra Usage của API key Groq hoặc thử lại sau.",
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
