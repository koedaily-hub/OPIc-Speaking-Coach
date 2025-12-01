"use client";

import React, { useRef, useState } from "react";
import TOPICS from "@/data/topics";
import TopicSelector from "@/components/TopicSelector";
import RandomWord from "../components/RandomWord";
import Recorder from "@/components/Recorder";
import FeedbackPanel from "@/components/FeedbackPanel";
import TimerFrame from "@/components/TimerFrame";
import oxfordData from "@/data/oxford3000_parsed.json";


export default function PracticePage() {
  // ==============================
  // STATE
  // ==============================
  const [topic, setTopic] = useState(TOPICS[0].id);
  const [level, setLevel] = useState("");
  const [pos, setPos] = useState("");
  const [word, setWord] = useState("");
  const [ipa, setIpa] = useState("");
  const [posTag, setPosTag] = useState("");


  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const [history, setHistory] = useState<string[]>([]);
  const [timeUpSignal, setTimeUpSignal] = useState(0);
  const [resetSignal, setResetSignal] = useState(0);

  const [feedback, setFeedback] = useState<any>(null);

  const [speakingTime, setSpeakingTime] = useState(45);

  async function getIPA(word: string): Promise<string> {
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = await res.json();

      const ipa =
        data?.[0]?.phonetics?.find((p: any) => p.text)?.text ||
        data?.[0]?.phonetics?.[0]?.text ||
        "";

      return ipa.replace(/\//g, ""); // bỏ dấu / nếu có → bạn tự thêm khi display
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
    modal: "Modal Verb"
  };

  // NEW — dùng để gọi startRecording từ RandomWord
  const recordButtonRef = useRef<HTMLButtonElement | null>(null);

  // ==============================
  // RANDOM WORD
  // ==============================
  const randomize = () => {
    let list = oxfordData;

    if (level) list = list.filter((i) => i.level === level);
    if (pos) list = list.filter((i) => i.pos === pos);

    if (list.length === 0) return;

    const picked = list[Math.floor(Math.random() * list.length)];

    setWord(picked.word);
    setPosTag(POS_MAP[picked.pos] || picked.pos);

    getIPA(picked.word).then(setIpa);

    setAudioBlob(null);
    setFeedback(null);

    setHistory((h) => [...h, picked.word]);

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
  // RECORD
  // ==============================
  const startRecording = () => {
    setResetSignal(n => n + 1);
    setTimeUpSignal(n => n + 1);
    setIsRecording(true);

    recordButtonRef.current?.click();   // ✔ 100% đúng
  };


  const recordAgain = () => {
    setAudioBlob(null);
    startRecording();
  };

  // ==============================
  // DOWNLOAD
  // ==============================
  const downloadRecording = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${word}.wav`;
    a.click();
  };

  // ==============================
  // GET FEEDBACK
  // ==============================
  const getFeedback = async () => {
    if (!audioBlob) return;

    const fd = new FormData();
    fd.append("audio", audioBlob);
    fd.append("word", word);
    fd.append("topic", topic);

    const res = await fetch("/api/evaluate", { method: "POST", body: fd });
    setFeedback(await res.json());
  };

  // ==============================
  // TOPIC LABEL UPPERCASE
  // ==============================
  const topicLabel =
    TOPICS.find((t) => t.id === topic)?.name.toUpperCase() ?? "TOPIC";

  // ==============================
  // UI
  // ==============================
  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-center">
        Random Word Speaking Challenge
      </h1>

      {/* FILTER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-3 mt-4">
        <TopicSelector value={topic} onChange={setTopic} topics={TOPICS} />

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

        <div>
          <label className="block mb-1 font-semibold">Choose Level:</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-base"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">Any Level</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold">Part of Speech:</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-base"
            value={pos}
            onChange={(e) => setPos(e.target.value)}
          >
            <option value="">Any</option>
            <option value="n">Noun</option>
            <option value="v">Verb</option>
            <option value="adj">Adjective</option>
          </select>
        </div>
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
          topicLabel={topicLabel}
          duration={speakingTime}
          timer={
            <TimerFrame
              duration={speakingTime}
              active={isRecording}
              onFinish={handleTimeUp}
              timeUpSignal={timeUpSignal}
            />
          }
          isRecording={isRecording}   // ⭐ THÊM DÒNG NÀY
          onRecord={startRecording}
          onRecordAgain={recordAgain}
          onDownload={downloadRecording}
          onFeedback={getFeedback}
        />
      </div>

      {/* HISTORY */}
      {history.length > 0 && (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50">
          <h2 className="font-semibold text-lg mb-3">Words Practiced</h2>

          <div className="flex flex-wrap gap-2">
            {history.map((w, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* RECORDER HIDDEN BUTTON */}
      <Recorder
      disabled={!word}
      timeUpSignal={timeUpSignal}
      resetSignal={resetSignal}
      onAudioReady={setAudioBlob}
      onRecordingStateChange={setIsRecording}
      recorderRef={recordButtonRef}     // ✔ Thêm dòng này
    />


      <FeedbackPanel result={feedback} />
    </div>
  );
}
