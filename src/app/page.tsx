"use client";

import React, { useRef, useState } from "react";
import topics from "@/data/topics.json";
import TopicSelector from "@/components/TopicSelector";
import RandomWord from "@/components/RandomWord";
import Recorder from "@/components/Recorder";
import FeedbackPanel from "@/components/FeedbackPanel";
import TimerFrame from "@/components/TimerFrame";
import oxfordData from "@/data/oxford3000_parsed.json";
import korean5666 from "@/data/korean5666.json";
import { FiX, FiCopy, FiTrash2 } from "react-icons/fi";

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

const EN_WORDS = oxfordData as EnglishWord[];
const KO_WORDS = korean5666 as KoreanWord[];

export default function PracticePage() {
  // ==============================
  // STATE
  // ==============================
  const [lang, setLang] = useState<"en" | "ko">("en");
  const [target, setTarget] = useState<TargetLevel>("IM");

  const [topic, setTopic] = useState(topics[0].id);
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
  const [history, setHistory] = useState<string[]>([]);

  // ✅ Tooltip style giống RandomWord (đặt trong page.tsx để dùng cho History)
  const tooltipBase =
    "absolute right-0 -top-9 opacity-0 group-hover:opacity-100 transition bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap";

  const removeHistoryItem = (index: number) => {
    setHistory((h) => h.filter((_, i) => i !== index));
  };

  const clearHistory = () => setHistory([]);

  const copyHistory = async () => {
    if (history.length === 0) return;

    const text = history.join(", ");
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
  const [speakingTime, setSpeakingTime] = useState(45);

  const recordButtonRef = useRef<HTMLButtonElement | null>(null);

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

    // 🔹 filters
    setLevel("");
    setPos("");

    // 🔹 timer signals
    setResetSignal((n) => n + 1);
    setTimeUpSignal((n) => n + 1);

    // 🔹 history 
    setHistory([]);
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

      // ✅ lưu history đúng
      setHistory((h) => [...h, picked.word]);
    } else {
      const list = KO_WORDS;
      if (list.length === 0) return;

      const picked = list[Math.floor(Math.random() * list.length)];

      setWord(picked.word);
      setPosTag("Korean Word");
      setIpa("");
      setMeaning(picked.meaning);

      // ✅ lưu history đúng
      setHistory((h) => [...h, picked.word]);
    }

    setAudioBlob(null);
    setFeedback(null);
    setResetSignal((n) => n + 1);
    setTimeUpSignal((n) => n + 1);
    setIsRecording(false);
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
    setFeedback(null);
    setResetSignal((n) => n + 1);
    setTimeUpSignal((n) => n + 1);
    setIsRecording(true);
    recordButtonRef.current?.click();
  };

  const recordAgain = () => {
    setAudioBlob(null);
    setFeedback(null);
    startRecording();
  };

  const stopRecording = () => {
    recordButtonRef.current?.click(); // ⛔ stop recorder
    setIsRecording(false);
  };

  // ==============================
  // DOWNLOAD
  // ==============================
  const downloadRecording = () => {
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
  if (!audioBlob || isLoadingFeedback) return;

  setIsLoadingFeedback(true);

  try {
    const fd = new FormData();
    fd.append("audio", audioBlob);
    fd.append("word", word);
    fd.append("topic", topic);
    fd.append("lang", lang);
    fd.append("target", target);
    fd.append("mode", "full");

    const res = await fetch("/api/evaluate", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) {
      alert(data?.detail || data?.error || "Failed to get AI feedback");
      return;
    }

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

  // ==============================
  // UI
  // ==============================
  return (
    <div className="max-w-xl mx-auto py-10 px-4 relative">
      {/* 🔥 LANGUAGE SWITCHER */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => {
            setLang("en");
            resetSession();
          }}
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            lang === "en" ? "bg-black text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          EN
        </button>

        <button
          onClick={() => {
          setLang("ko");
          resetSession();
        }}
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            lang === "ko"
              ? "bg-black text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          KO
        </button>
      </div>

      <h1 className="text-2xl font-bold text-center">
        Improve Your Reflex With Random Word Speaking Challenge
      </h1>
      {/* FILTER GRID — dùng cho cả EN & KO */}
      <div className="mt-4">
      <label className="block mb-1 font-semibold">Target OPIc:</label>
      <select
        className="w-full border rounded-lg px-3 py-2 text-base"
        value={target}
        onChange={(e) => setTarget(e.target.value as TargetLevel)}
        disabled={isRecording}
      >
        <option value="Communication">Communication</option>
        <option value="IL">IL</option>
        <option value="IM">IM</option>
        <option value="IH">IH</option>
        <option value="AL">AL</option>
      </select>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-3 mt-4">
      <TopicSelector value={topic} onChange={setTopic} topics={topics} />

      <div>
        <label className="block mb-1 font-semibold">Speaking Time:</label>
        <select
          className="w-full border rounded-lg px-3 py-2 text-base"
          value={speakingTime}
          onChange={(e) => setSpeakingTime(Number(e.target.value))}
          disabled={isRecording}
        >
          <option value={30}>30 seconds</option>
          <option value={45}>45 seconds</option>
          <option value={60}>60 seconds</option>
          <option value={90}>90 seconds</option>
        </select>
      </div>

      

      {/* ✅ Level + POS: chỉ hiển thị khi EN */}
      {lang === "en" && (
        <>
          <div>
            <label className="block mb-1 font-semibold">Choose Level:</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-base"
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
            <label className="block mb-1 font-semibold">Part of Speech:</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-base"
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
        className="mt-6 w-full px-4 py-3 bg-[var(--koe-green)] hover:bg-[var(--koe-green-dark)] text-white rounded-lg font-bold"
        onClick={randomize}
      >
        RANDOM WORD
      </button>

      {/* RANDOM WORD BOX */}
      <div className="relative mt-8">
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
          onFeedback={getFeedback}
        />
      </div>

      {/* HISTORY */}
      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Words Practiced</h2>

          {/* ✅ ICON ONLY + TOOLTIP */}
          <div className="flex gap-2">
            {/* COPY ALL */}
            <div className="relative group">
              <button
                onClick={copyHistory}
                disabled={history.length === 0}
                className={[
                  "p-2 border rounded-md transition",
                  history.length === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:bg-gray-100 text-gray-700",
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
                  "p-2 border rounded-md transition",
                  history.length === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:bg-gray-100 text-gray-700",
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
          <p className="text-sm text-gray-500">
            No words yet. Click RANDOM WORD to start.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {history.map((w, i) => (
              <span
                key={`${w}-${i}`}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm"
              >
                {w}

                {/* REMOVE ONE */}
                <button
                  onClick={() => removeHistoryItem(i)}
                  className="text-green-900/60 hover:text-green-900"
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
        onAudioReady={setAudioBlob}
        onRecordingStateChange={setIsRecording}
        recorderRef={recordButtonRef}
      />

      <div id="ai-feedback-section" className="mt-6">
        <FeedbackPanel result={feedback} />
      </div>

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
