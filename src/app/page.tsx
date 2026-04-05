"use client";

import React, { useEffect, useRef, useState } from "react";
import topics from "@/data/topics.json";
import TopicSelector from "@/components/TopicSelector";
import RandomWord from "@/components/RandomWord";
import Recorder from "@/components/Recorder";
import FeedbackPanel from "@/components/FeedbackPanel";
import TimerFrame from "@/components/TimerFrame";
import oxfordData from "@/data/oxford3000_parsed.json";
import korean5666 from "@/data/korean5666.json";
import { FiX, FiCopy, FiTrash2, FiThumbsUp, FiThumbsDown, FiMessageSquare } from "react-icons/fi";
import { getOrCreateSessionId } from "@/lib/session-id";
import {
  sendFeedbackReaction,
  sendIssueReport,
  sendUsageEvent,
} from "@/lib/client-analytics";

// --------- KIỂU DỮ LIỆU CHO 2 BỘ TỪ ---------
type EnglishWord = {
  word: string;
  pos: string;
  level: string;
};

type KoreanWord = {
  id: number;
  word: string;
  meaning: string;
  pos: string;
};

type TargetLevel = "IL" | "IM" | "IH" | "AL" | "Communication";

type FeedbackResult = {
  feedbackEventId?: string | null;
  transcript: string;
  wordCount: number;
  usedRandomWord: boolean;
  topicName?: string;
  target?: TargetLevel;
  topic_relevance: {
    status: "on_topic" | "not_on_topic";
    reason: string;
  };
  expression_fixes: Array<{ original: string; suggested: string }>;
  opic_assessment: {
    improvement_points: string[];
  };
  suggested_transcript: string;
  encouragement: { quote: string; author: string };
};

type HistoryStatus = "skipped" | "recorded" | "reviewed";

type HistoryItem = {
  token: number;
  id: string;
  word: string;
  status: HistoryStatus;
  createdAt: number;
  feedback?: FeedbackResult;
};

type FeedbackVote = "like" | "dislike" | null;

type FeedbackCollectionState = {
  vote: FeedbackVote;
  reasons: string[];
  otherText: string;
  submitted: boolean;
};

type ReportType = "bug" | "feature_request" | "ai_quality";

type ReportFormState = {
  type: ReportType;
  email: string;
  content: string;
  submitted: boolean;
};

const NOT_HELPFUL_REASONS = [
  "Too generic",
  "Incorrect correction",
  "Transcript sounds unnatural",
  "Topic fit is inaccurate",
  "Other",
];

const EN_WORDS = oxfordData as EnglishWord[];
const KO_WORDS = korean5666 as KoreanWord[];
const DEFAULT_TOPIC_ID = topics.find((t) => t.id === "hobbies")?.id ?? topics[0].id;

export default function PracticePage() {
  // ==============================
  // STATE
  // ==============================
  const [lang, setLang] = useState<"en" | "ko">("en");
  const [target, setTarget] = useState<TargetLevel>("Communication");

  const [topic, setTopic] = useState(DEFAULT_TOPIC_ID);
  const [level, setLevel] = useState("");
  const [pos, setPos] = useState("");

  const [word, setWord] = useState("");
  const [ipa, setIpa] = useState("");
  const [posTag, setPosTag] = useState("");
  const [meaning, setMeaning] = useState("");

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeReviewedToken, setActiveReviewedToken] = useState<number | null>(null);
  const [currentWordToken, setCurrentWordToken] = useState(0);
  const [feedbackCollectionByToken, setFeedbackCollectionByToken] = useState<
    Record<number, FeedbackCollectionState>
  >({});
  const [sessionId, setSessionId] = useState("");
  const [reportForm, setReportForm] = useState<ReportFormState>({
    type: "ai_quality",
    email: "",
    content: "",
    submitted: false,
  });
  const [showFeedbackTooltipIntro, setShowFeedbackTooltipIntro] = useState(false);

  // ✅ Tooltip style giống RandomWord (đặt trong page.tsx để dùng cho History)
  const tooltipBase =
    "absolute right-0 -top-9 opacity-0 group-hover:opacity-100 transition bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap";

  const removeHistoryItem = (index: number) => {
    setHistory((h) => h.filter((_, i) => i !== index));
  };

  const addSkippedIfNeeded = (prevWord: string, prevToken: number, hadAudio: boolean) => {
    if (!prevWord || prevToken === 0 || hadAudio) return;
    setHistory((h) => [
      ...h,
      {
        token: prevToken,
        id: `h-${prevToken}`,
        word: prevWord,
        status: "skipped",
        createdAt: Date.now(),
      },
    ]);
  };

  const clearHistory = () => setHistory([]);

  const copyHistory = async () => {
    const completedWords = history
      .filter((item) => item.status === "recorded" || item.status === "reviewed")
      .map((item) => item.word);

    if (completedWords.length === 0) return;

    const text = completedWords.join(", ");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    // ✅ SHOW TOAST
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  const [timeUpSignal, setTimeUpSignal] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);

  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [speakingTime, setSpeakingTime] = useState(30);

  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
  const selectClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400";
  const cardClass = "rounded-2xl border border-slate-200 bg-white shadow-sm";

  const recordButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setSessionId(getOrCreateSessionId());

    const tooltipSeenKey = "koe_get_feedback_tooltip_seen_v1";
    if (typeof window !== "undefined" && !window.localStorage.getItem(tooltipSeenKey)) {
      setShowFeedbackTooltipIntro(true);
      window.localStorage.setItem(tooltipSeenKey, "1");
      window.setTimeout(() => {
        setShowFeedbackTooltipIntro(false);
      }, 2200);
    }
  }, []);

  const logUsageEvent = async (
    eventName:
      | "record_finished"
      | "ai_feedback_requested"
      | "ai_feedback_received"
      | "feedback_helpful"
      | "feedback_not_helpful"
      | "report_issue_submitted",
    metadata?: Record<string, unknown>
  ) => {
    if (!sessionId) return;

    try {
      await sendUsageEvent({
        sessionId,
        eventName,
        word: word || undefined,
        topic,
        target,
        metadata,
      });
    } catch (error) {
      console.error("[analytics] usage event failed", eventName, error);
    }
  };

  const resetSession = () => {
    // 🔹 word + content
    setWord("");
    setIpa("");
    setPosTag("");
    setMeaning("");

    // 🔹 audio & recording
    setAudioBlob(null);
    setIsRecording(false);

    // 🔹 feedback
    setFeedback(null);
    setTranscript("");
    setIsLoadingTranscript(false);

    // 🔹 filters
    setLevel("");
    setPos("");

    // 🔹 timer signals
    setResetSignal((n) => n + 1);
    setTimeUpSignal((n) => n + 1);

    // 🔹 history 
    setHistory([]);
    setActiveReviewedToken(null);
    setCurrentWordToken(0);
    setFeedbackCollectionByToken({});
  };


  // ==============================
  // IPA FUNCTION (EN ONLY)
  // ==============================
  async function getIPA(target: string): Promise<string> {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${target}`
      );
      const data = await res.json();

      const ipaText =
        data?.[0]?.phonetics?.find((p: any) => p.text)?.text ||
        data?.[0]?.phonetics?.[0]?.text ||
        "";

      return ipaText.replace(/\//g, "");
    } catch {
      return "";
    }
  }

  const POS_MAP: Record<string, string> = {
    n: "Noun",
    v: "Verb",
    adj: "Adjective",
    adv: "Adverb",
    prep: "Preposition",
    pron: "Pronoun",
    det: "Determiner",
    conj: "Conjunction",
    exclam: "Exclamation",
    number: "Number",
    modal: "Modal Verb",
  };

  const LEVEL_LABEL: Record<string, string> = {
    A1: "Beginner",
    A2: "Elementary",
    B1: "Intermediate",
    B2: "Upper-Intermediate",
  };

  // ==============================
  // RANDOM WORD (EN & KO)
  // ==============================
  const randomize = () => {
    const prevWord = word;
    const prevToken = currentWordToken;
    const hadAudio = !!audioBlob;
    const nextToken = Date.now();

    addSkippedIfNeeded(prevWord, prevToken, hadAudio);

    if (lang === "en") {
      let list = EN_WORDS;

      if (level) list = list.filter((i) => i.level === level);
      if (pos) {
        if (pos === "other") {
          const main = new Set(["n", "v", "adj", "adv"]);
          list = list.filter((i) => !main.has(i.pos));
        } else {
          list = list.filter((i) => i.pos === pos);
        }
      }
      if (list.length === 0) return;

      const picked = list[Math.floor(Math.random() * list.length)];

      setWord(picked.word);
      setPosTag(POS_MAP[picked.pos] || picked.pos);
      getIPA(picked.word).then(setIpa);
      setMeaning("");
    } else {
      const list = KO_WORDS;
      if (list.length === 0) return;

      const picked = list[Math.floor(Math.random() * list.length)];

      setWord(picked.word);
      setPosTag("Korean Word");
      setIpa("");
      setMeaning(picked.meaning);
    }

    setCurrentWordToken(nextToken);
    setActiveReviewedToken(null);
    setAudioBlob(null);
    setFeedback(null);
    setTranscript("");
    setIsLoadingTranscript(false);
    setResetSignal((n) => n + 1);
    setTimeUpSignal((n) => n + 1);
    setIsRecording(false);

    setTimeout(() => {
      const section = document.getElementById("random-word-section");
      if (!section) return;

      const targetTop = section.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    }, 50);
  };

  // ==============================
  // TIMER FINISHED
  // ==============================
  const handleTimeUp = () => {
    setIsRecording(false);
    setTimeUpSignal((n) => n + 1);
  };

  // ==============================
  // RECORDING
  // ==============================
  const startRecording = () => {
    if (!canRecord) return;
    setFeedback(null);
    setTranscript("");
    setIsLoadingTranscript(false);
    setResetSignal((n) => n + 1);
    setTimeUpSignal((n) => n + 1);
    setIsRecording(true);
    recordButtonRef.current?.click();
  };

  const recordAgain = () => {
    if (!canRecordAgain) return;
    setAudioBlob(null);
    setFeedback(null);
    setTranscript("");
    setIsLoadingTranscript(false);
    setResetSignal((n) => n + 1);
    setTimeUpSignal((n) => n + 1);
    setIsRecording(true);
    recordButtonRef.current?.click();
  };

  const stopRecording = () => {
    if (!canStop) return;
    recordButtonRef.current?.click(); // ⛔ stop recorder
    setIsRecording(false);
  };

  // ==============================
  // DOWNLOAD
  // ==============================
  const downloadRecording = () => {
    if (!canDownload) return;
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${word || "recording"}.wav`;
    a.click();
  };

  // ==============================
  // FEEDBACK
  // ==============================
const getFeedback = async () => {
  if (!canFeedback) return;
  if (!audioBlob || isLoadingFeedback) return;

  setIsLoadingFeedback(true);

  try {
    logUsageEvent("ai_feedback_requested", {
      currentWordToken,
    });

    const fd = new FormData();
    fd.append("audio", audioBlob);
    fd.append("word", word);
    fd.append("topic", topic);
    fd.append("lang", lang);
    fd.append("target", target);
    fd.append("mode", "full");
    if (sessionId) {
      fd.append("sessionId", sessionId);
    }

    const res = await fetch("/api/evaluate", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) {
      alert(data?.detail || data?.error || "Failed to get AI feedback");
      return;
    }

    setHistory((prev) => {
      const idx = prev.findIndex((item) => item.token === currentWordToken);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          status: "reviewed",
          feedback: data,
          createdAt: Date.now(),
        };
        return next;
      }

      return [
        ...prev,
        {
          token: currentWordToken,
          id: `h-${currentWordToken}`,
          word,
          status: "reviewed",
          createdAt: Date.now(),
          feedback: data,
        },
      ];
    });

    setActiveReviewedToken(currentWordToken);
    setFeedbackCollectionByToken((prev) => ({
      ...prev,
      [currentWordToken]: { vote: null, reasons: [], otherText: "", submitted: false },
    }));
    setFeedback(data);
    setTimeout(() => {
      document
        .getElementById("ai-feedback-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  } finally {
    setIsLoadingFeedback(false);
  }
};

  // ==============================
  // TOPIC LABEL
  // ==============================
  const topicLabel =
    topics.find((t) => t.id === topic)?.name.toUpperCase() ?? "TOPIC";

  const hasWord = !!word;
  const hasCompletedRecording = !!audioBlob && !isRecording;
  const canRecord = hasWord && !isRecording && !audioBlob;
  const canStop = hasWord && isRecording;
  const canUseAudioActions = hasCompletedRecording;
  const canRecordAgain = canUseAudioActions;
  const canDownload = canUseAudioActions;
  const canFeedback = canUseAudioActions && !isLoadingFeedback;

  const completedHistoryCount = history.filter(
    (item) => item.status === "recorded" || item.status === "reviewed"
  ).length;

  const restoreFeedbackFromHistory = (entry: HistoryItem) => {
    if (!entry.feedback) return;
    setFeedback(entry.feedback);
    setActiveReviewedToken(entry.token);
    setTimeout(() => {
      document
        .getElementById("ai-feedback-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleAudioReady = (blob: Blob | null) => {
    setAudioBlob(blob);
    if (!blob) {
      setTranscript("");
      setIsLoadingTranscript(false);
      return;
    }

    setIsLoadingTranscript(true);
    setTranscript("");

    const sttForm = new FormData();
    sttForm.append("audio", blob);
    sttForm.append("word", word);
    sttForm.append("topic", topic);
    sttForm.append("lang", lang);
    sttForm.append("target", target);
    sttForm.append("mode", "stt");
    if (sessionId) {
      sttForm.append("sessionId", sessionId);
    }

    fetch("/api/evaluate", { method: "POST", body: sttForm })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.detail || data?.error || "Failed to get transcript");
        }
        setTranscript(String(data?.transcript || ""));
      })
      .catch(() => {
        setTranscript("");
      })
      .finally(() => {
        setIsLoadingTranscript(false);
      });

    if (blob) {
      logUsageEvent("record_finished", { currentWordToken });

      setHistory((prev) => {
        const idx = prev.findIndex((item) => item.token === currentWordToken);
        if (idx >= 0) {
          const next = [...prev];
          const existing = next[idx];
          next[idx] = {
            ...existing,
            status: existing.status === "reviewed" ? "reviewed" : "recorded",
            createdAt: Date.now(),
          };
          return next;
        }

        if (!word) return prev;
        return [
          ...prev,
          {
            token: currentWordToken,
            id: `h-${currentWordToken}`,
            word,
            status: "recorded",
            createdAt: Date.now(),
          },
        ];
      });
    }
  };

  const activeFeedbackCollection: FeedbackCollectionState =
    activeReviewedToken !== null
      ? feedbackCollectionByToken[activeReviewedToken] ?? { vote: null, reasons: [], otherText: "", submitted: false }
      : { vote: null, reasons: [], otherText: "", submitted: false };

  const activeFeedbackEventId =
    activeReviewedToken !== null
      ? history.find((entry) => entry.token === activeReviewedToken)?.feedback?.feedbackEventId ?? null
      : null;

  const handleVoteSelect = (value: Exclude<FeedbackVote, null>) => {
    if (activeReviewedToken === null) return;

    if (value === "like") {
      if (sessionId && activeFeedbackEventId) {
        sendFeedbackReaction({
          feedbackEventId: activeFeedbackEventId,
          sessionId,
          helpful: true,
        }).catch((error) => {
          console.error("[analytics] feedback like failed", error);
        });
      }
    }

    setFeedbackCollectionByToken((prev) => ({
      ...prev,
      [activeReviewedToken]: {
        vote: value,
        reasons: value === "like" ? [] : prev[activeReviewedToken]?.reasons ?? [],
        otherText: value === "like" ? "" : prev[activeReviewedToken]?.otherText ?? "",
        submitted: value === "like",
      },
    }));
  };

  const toggleNotHelpfulReason = (reason: string) => {
    if (activeReviewedToken === null) return;
    setFeedbackCollectionByToken((prev) => {
      const current = prev[activeReviewedToken] ?? { vote: "dislike" as const, reasons: [], otherText: "", submitted: false };
      const hasReason = current.reasons.includes(reason);
      return {
        ...prev,
        [activeReviewedToken]: {
          vote: "dislike",
          reasons: hasReason
            ? current.reasons.filter((r) => r !== reason)
            : [...current.reasons, reason],
          otherText: reason === "Other" && hasReason ? "" : current.otherText,
          submitted: false,
        },
      };
    });
  };

  const handleOtherReasonTextChange = (text: string) => {
    if (activeReviewedToken === null) return;
    setFeedbackCollectionByToken((prev) => {
      const current = prev[activeReviewedToken] ?? { vote: "dislike" as const, reasons: ["Other"], otherText: "", submitted: false };
      return {
        ...prev,
        [activeReviewedToken]: {
          ...current,
          vote: "dislike",
          submitted: false,
          otherText: text,
        },
      };
    });
  };

  const submitDislikeFeedback = () => {
    if (activeReviewedToken === null) return;
    const hasOther = activeFeedbackCollection.reasons.includes("Other");
    const validOtherText = activeFeedbackCollection.otherText.trim().length > 0;
    if (!activeFeedbackCollection.reasons.length) return;
    if (hasOther && !validOtherText) return;

    if (sessionId && activeFeedbackEventId) {
      const reasonText = hasOther
        ? activeFeedbackCollection.reasons
            .filter((reason) => reason !== "Other")
            .concat(activeFeedbackCollection.otherText.trim())
            .join(" | ")
        : activeFeedbackCollection.reasons.join(" | ");

      sendFeedbackReaction({
        feedbackEventId: activeFeedbackEventId,
        sessionId,
        helpful: false,
        reason: reasonText,
      }).catch((error) => {
        console.error("[analytics] feedback dislike failed", error);
      });
    }

    setFeedbackCollectionByToken((prev) => ({
      ...prev,
      [activeReviewedToken]: {
        ...activeFeedbackCollection,
        submitted: true,
      },
    }));
  };

  const submitReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reportForm.content.trim();
    if (!trimmed) return;

    if (sessionId) {
      try {
        await sendIssueReport({
          sessionId,
          type: reportForm.type,
          message: trimmed,
          page: window.location.pathname,
          context: {
            lang,
            topic,
            target,
            word,
            activeReviewedToken,
            feedbackEventId: activeFeedbackEventId,
          },
          email: reportForm.email.trim() || undefined,
        });
      } catch (error) {
        console.error("[analytics] report issue failed", error);
      }
    }

    setReportForm((prev) => ({
      ...prev,
      email: prev.email.trim(),
      content: "",
      submitted: true,
    }));

    window.setTimeout(() => {
      setReportForm((prev) => ({ ...prev, submitted: false }));
    }, 1800);
  };

  // ==============================
  // UI
  // ==============================
  return (
    <div className="relative mx-auto max-w-3xl overflow-hidden px-4 py-8 sm:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(26% 18% at 12% 10%, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0) 75%), radial-gradient(24% 18% at 85% 18%, rgba(52,211,153,0.08) 0%, rgba(52,211,153,0) 72%), radial-gradient(28% 20% at 78% 72%, rgba(16,185,129,0.07) 0%, rgba(16,185,129,0) 74%), radial-gradient(20% 15% at 22% 75%, rgba(74,222,128,0.06) 0%, rgba(74,222,128,0) 70%)",
        }}
      />
      {/* 🔥 LANGUAGE SWITCHER */}
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          onClick={() => {
            setLang("en");
            resetSession();
          }}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            lang === "en" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
          }`}
        >
          EN
        </button>

        <button
          onClick={() => {
          setLang("ko");
          resetSession();
        }}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            lang === "ko"
              ? "bg-slate-900 text-white"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          KO
        </button>
      </div>

      <div className="mb-6 text-center sm:mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Train Your Speaking Reflex
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Practice quickly, stay on topic, and get calm, actionable AI feedback after each recording.
        </p>
      </div>

      <div className={`${cardClass} p-4 sm:p-5`}>
      {/* FILTER GRID — dùng cho cả EN & KO */}
      <div>
      <label className={labelClass}>Target</label>
      <select
        className={selectClass}
        value={target}
        onChange={(e) => setTarget(e.target.value as TargetLevel)}
        disabled={isRecording}
      >
        <option value="Communication">Communication</option>
        <option value="IL">OPIc IL Level</option>
        <option value="IM">OPIc IM Level</option>
        <option value="IH">OPIc IH Level</option>
        <option value="AL">OPIc AL Level</option>
      </select>
    </div>

    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      <TopicSelector value={topic} onChange={setTopic} topics={topics} />

      <div>
        <label className={labelClass}>Speaking Time</label>
        <select
          className={selectClass}
          value={speakingTime}
          onChange={(e) => setSpeakingTime(Number(e.target.value))}
          disabled={isRecording}
        >
          <option value={30}>30 seconds</option>
          <option value={45}>45 seconds</option>
          <option value={60}>60 seconds</option>
          <option value={90}>90 seconds</option>
          <option value={120}>2 minutes</option>
          <option value={180}>3 minutes</option>
          <option value={300}>5 minutes</option>
          <option value={600}>10 minutes</option>
        </select>
      </div>

      

      {/* ✅ Level + POS: chỉ hiển thị khi EN */}
      {lang === "en" && (
        <>
          <div>
            <label className={labelClass}>Choose Level</label>
            <select
              className={selectClass}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              disabled={isRecording}
            >
              <option value="">Any Level</option>
              <option value="A1">{LEVEL_LABEL.A1}</option>
              <option value="A2">{LEVEL_LABEL.A2}</option>
              <option value="B1">{LEVEL_LABEL.B1}</option>
              <option value="B2">{LEVEL_LABEL.B2}</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Part of Speech</label>
            <select
              className={selectClass}
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              disabled={isRecording}
            >
              <option value="">Any</option>
              <option value="n">Noun</option>
              <option value="v">Verb</option>
              <option value="adv">Adverb</option>
              <option value="adj">Adjective</option>
              <option value="other">Others</option>
            </select>
          </div>
        </>
      )}
      </div>
      {/* RANDOM BUTTON */}
      <button
        className="mt-5 w-full rounded-xl bg-[var(--koe-green)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--koe-green-dark)]"
        onClick={randomize}
      >
        RANDOM WORD
      </button>
      </div>

      {/* RANDOM WORD BOX */}
      <div id="random-word-section" className="relative mt-6">
        <RandomWord
          word={word}
          ipa={ipa}
          pos={posTag}
          meaning={meaning}
          lang={lang}
          topicLabel={topicLabel}
          duration={speakingTime}
          hasAudio={!!audioBlob} // ✅ thêm dòng này
          timer={
            <TimerFrame
              duration={speakingTime}
              active={isRecording}
              onFinish={handleTimeUp}
              timeUpSignal={timeUpSignal}
            />
          }
          isRecording={isRecording}
          onRecord={startRecording}
          onStop={stopRecording} // ✅ NEW
          onRecordAgain={recordAgain}
          onDownload={downloadRecording}
          canRecord={canRecord}
          canStop={canStop}
          canRecordAgain={canRecordAgain}
          canDownload={canDownload}
        />
      </div>

      {(hasCompletedRecording || isLoadingTranscript) && (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Transcript
            </h4>
            {!isRecording && hasCompletedRecording && (
              <div className="relative group">
                <button
                  type="button"
                  onClick={getFeedback}
                  disabled={!canFeedback}
                  className={[
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                    canFeedback
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "cursor-not-allowed bg-slate-200 text-slate-400",
                  ].join(" ")}
                >
                  <span className="relative inline-flex h-5 w-5 items-center justify-center">
                    <FiMessageSquare className="h-4 w-4" aria-hidden="true" />
                    <span className="absolute -right-1.5 -top-1.5 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-white/95 px-0.5 text-[9px] font-bold leading-none text-emerald-700 shadow-sm">
                      F
                    </span>
                  </span>
                  <span>{isLoadingFeedback ? "Getting feedback..." : "Get Feedback"}</span>
                </button>

                <span
                  className={[
                    "pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white transition",
                    showFeedbackTooltipIntro ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  ].join(" ")}
                >
                  Get AI Feedback
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            {isLoadingTranscript ? (
              <p className="text-sm text-slate-500">Preparing transcript...</p>
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                {transcript || "(empty)"}
              </p>
            )}
          </div>
        </section>
      )}

      {/* HISTORY */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Words Practiced</h2>

          {/* ✅ ICON ONLY + TOOLTIP */}
          <div className="flex gap-2">
            {/* COPY ALL */}
            <div className="relative group">
              <button
                onClick={copyHistory}
                disabled={completedHistoryCount === 0}
                className={[
                  "rounded-lg border p-2 text-sm transition",
                  completedHistoryCount === 0
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : "bg-white text-slate-700 hover:bg-slate-100",
                ].join(" ")}
                type="button"
                aria-label="Copy all"
              >
                <FiCopy />
              </button>
              <span className={tooltipBase}>Copy all</span>
            </div>

            {/* CLEAR ALL */}
            <div className="relative group">
              <button
                onClick={clearHistory}
                disabled={history.length === 0}
                className={[
                  "rounded-lg border p-2 text-sm transition",
                  history.length === 0
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : "bg-white text-slate-700 hover:bg-slate-100",
                ].join(" ")}
                type="button"
                aria-label="Clear all"
              >
                <FiTrash2 />
              </button>
              <span className={tooltipBase}>Clear all</span>
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-slate-500">
            No words yet. Click RANDOM WORD to start.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {history.map((item, i) => (
              <span
                key={`${item.word}-${i}`}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
                  item.status === "reviewed"
                    ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                    : item.status === "recorded"
                    ? "border-emerald-100 bg-emerald-50/60 text-emerald-800"
                    : item.status === "skipped"
                    ? "border-slate-200 bg-slate-100 text-slate-600"
                    : "border-slate-200 bg-white text-slate-700",
                  item.status === "reviewed" && activeReviewedToken === item.token
                    ? "ring-2 ring-emerald-200"
                    : "",
                ].join(" ")}
              >
                {item.status === "reviewed" && item.feedback ? (
                  <button
                    type="button"
                    onClick={() => restoreFeedbackFromHistory(item)}
                    className="font-medium hover:underline"
                  >
                    {item.word}
                  </button>
                ) : (
                  <span>{item.word}</span>
                )}

                {/* REMOVE ONE */}
                <button
                  onClick={() => removeHistoryItem(i)}
                  className="text-emerald-800/60 transition hover:text-emerald-900"
                  title="Remove"
                  type="button"
                >
                  <FiX />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* RECORDER — HIDDEN BUTTON */}
      <Recorder
        disabled={!word}
        timeUpSignal={timeUpSignal}
        resetSignal={resetSignal}
        onAudioReady={handleAudioReady}
        onRecordingStateChange={setIsRecording}
        recorderRef={recordButtonRef}
      />

      <div id="ai-feedback-section" className="mt-6">
        <FeedbackPanel
          result={feedback}
          suggestionsFooter={
            feedback ? (
              <>
                <div className="mt-1 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleVoteSelect("like")}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                      activeFeedbackCollection.vote === "like"
                        ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    <FiThumbsUp className="text-sm" />
                    Like
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVoteSelect("dislike")}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                      activeFeedbackCollection.vote === "dislike"
                        ? "border-amber-300 bg-amber-100 text-amber-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    <FiThumbsDown className="text-sm" />
                    Dislike
                  </button>
                </div>

                {activeFeedbackCollection.vote === "like" && (
                  <p className="mt-2 text-sm text-emerald-700">Thanks! We’ll keep improving feedback quality.</p>
                )}

                {activeFeedbackCollection.vote === "dislike" && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Why was it not helpful? (Select one or more)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {NOT_HELPFUL_REASONS.map((reason) => {
                        const selected = activeFeedbackCollection.reasons.includes(reason);
                        return (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => toggleNotHelpfulReason(reason)}
                            className={[
                              "rounded-full border px-3 py-1.5 text-sm transition",
                              selected
                                ? "border-amber-300 bg-amber-100 text-amber-800"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                            ].join(" ")}
                          >
                            {reason}
                          </button>
                        );
                      })}
                    </div>

                    {activeFeedbackCollection.reasons.includes("Other") && (
                      <textarea
                        value={activeFeedbackCollection.otherText}
                        onChange={(e) => handleOtherReasonTextChange(e.target.value)}
                        rows={2}
                        placeholder="Tell us more..."
                        className="mt-3 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      />
                    )}

                    <div className="mt-3 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={submitDislikeFeedback}
                        disabled={
                          !activeFeedbackCollection.reasons.length ||
                          (activeFeedbackCollection.reasons.includes("Other") &&
                            !activeFeedbackCollection.otherText.trim())
                        }
                        className={[
                          "rounded-lg px-3 py-2 text-sm font-medium transition",
                          activeFeedbackCollection.reasons.length &&
                          (!activeFeedbackCollection.reasons.includes("Other") ||
                            !!activeFeedbackCollection.otherText.trim())
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "cursor-not-allowed bg-slate-200 text-slate-400",
                        ].join(" ")}
                      >
                        Submit feedback
                      </button>
                    </div>
                    {activeFeedbackCollection.submitted && (
                      <p className="mt-2 text-right text-sm text-emerald-700">Thanks for sharing your feedback.</p>
                    )}
                  </div>
                )}
              </>
            ) : undefined
          }
        />
      </div>

      {false && (
      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <h4 className="text-sm font-semibold text-slate-800">Feedback</h4>
        <p className="mt-1 text-xs text-slate-500">
          Leave your email to <strong>get discount</strong> when paid plans go live.
        </p>

        <form onSubmit={submitReportIssue} className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Type</label>
            <select
              value={reportForm.type}
              onChange={(e) =>
                setReportForm((prev) => ({
                  ...prev,
                  type: e.target.value as ReportType,
                  submitted: false,
                }))
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="bug">Bug</option>
              <option value="feature_request">Feature request</option>
              <option value="ai_quality">AI quality feedback</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Email (optional)</label>
            <input
              type="email"
              value={reportForm.email}
              onChange={(e) =>
                setReportForm((prev) => ({
                  ...prev,
                  email: e.target.value,
                  submitted: false,
                }))
              }
              placeholder="you@example.com"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Details</label>
            <textarea
              value={reportForm.content}
              onChange={(e) =>
                setReportForm((prev) => ({
                  ...prev,
                  content: e.target.value,
                  submitted: false,
                }))
              }
              rows={3}
              placeholder="Share your issue or suggestion..."
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="submit"
              disabled={!reportForm.content.trim()}
              className={[
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                reportForm.content.trim()
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "cursor-not-allowed bg-slate-200 text-slate-400",
              ].join(" ")}
            >
              Submit
            </button>

            {reportForm.submitted && <p className="text-sm text-emerald-700">Submitted. Thank you!</p>}
          </div>
        </form>
      </section>
      )}

      {feedback?.encouragement?.quote && (
        <section className="mt-10 border-t border-slate-100 pt-8 sm:pt-10">
          <blockquote className="mx-auto max-w-2xl">
            <p className="text-center text-xl italic leading-8 text-emerald-700 sm:text-2xl sm:leading-10">
              “{feedback.encouragement.quote}”
            </p>
            <footer className="mt-4 text-center text-sm text-slate-500">— {feedback.encouragement.author}</footer>
          </blockquote>
        </section>
      )}

      {/* TOAST */}
      {showToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-2 bg-black text-white text-sm rounded-full shadow-lg">
            Copied to clipboard
          </div>
        </div>
      )}
    </div>
  );
}
