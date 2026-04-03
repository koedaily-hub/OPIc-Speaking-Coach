import OpenAI from "openai";
import { NextResponse } from "next/server";
import topics from "@/data/topics.json";
import { FAMOUS_QUOTES } from "@/data/famousQuotes";

export const runtime = "nodejs";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_CHAT_MODEL = "llama-3.3-70b-versatile";
const GROQ_STT_MODEL = "whisper-large-v3-turbo";

const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

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

  const completion = await groq.chat.completions.create({
    model: GROQ_CHAT_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const text = completion.choices?.[0]?.message?.content;
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

    const stt = await groq.audio.transcriptions.create({
      model: GROQ_STT_MODEL,
      file,
      language: lang === "ko" ? "ko" : "en",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

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

    // quotes: chỉ cho GPT chọn trong list (không bịa)
    const quotes = FAMOUS_QUOTES;

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
- suggested_transcript: give an improved sample answer suited to learner level; if current answer is already very good, write a short praise sentence instead of rewriting.
- Pick encouragement quote ONLY from the list provided.
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

Quotes list (choose 1 exactly):
${quotes.map((q) => `- "${q.text}" — ${q.author}`).join("\n")}
`;

    const graded = await callGroqJSON<any>(system, user);

    // ---------- D) Return to UI ----------
    return NextResponse.json({
      transcript,
      wordCount,
      usedRandomWord,
      topicName,
      target,
      ...graded,
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
