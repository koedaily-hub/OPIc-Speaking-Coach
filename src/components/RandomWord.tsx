"use client";

import React from "react";
import {
  FiRotateCcw,
  FiMic,
  FiSquare,
  FiDownload,
  FiMessageCircle,
} from "react-icons/fi";

interface RandomWordProps {
  word: string;
  ipa?: string;
  pos?: string;
  meaning?: string;
  lang: "en" | "ko";
  isRecording?: boolean;
  hasAudio?: boolean;
  topicLabel: string;
  duration: number;
  timer: React.ReactNode;
  onRecord: () => void;
  onStop: () => void;
  onRecordAgain: () => void;
  onDownload: () => void;
  onFeedback: () => void;
  canRecord: boolean;
  canStop: boolean;
  canRecordAgain: boolean;
  canDownload: boolean;
  canFeedback: boolean;
}

type ActionButtonProps = {
  onClick: () => void;
  disabled: boolean;
  label: string;
  className: string;
  children: React.ReactNode;
};

function ActionButton({
  onClick,
  disabled,
  label,
  className,
  children,
}: ActionButtonProps) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={[
          "inline-flex h-12 w-12 items-center justify-center rounded-full shadow-sm transition",
          disabled
            ? "cursor-not-allowed bg-slate-200 text-slate-400"
            : className,
        ].join(" ")}
      >
        {children}
      </button>
      <span
        className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2
        whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0
        transition group-hover:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}

export default function RandomWord({
  word,
  ipa,
  pos,
  meaning,
  lang,
  isRecording = false,
  hasAudio = false,
  topicLabel,
  duration,
  timer,
  onRecord,
  onStop,
  onRecordAgain,
  onDownload,
  onFeedback,
  canRecord,
  canStop,
  canRecordAgain,
  canDownload,
  canFeedback,
}: RandomWordProps) {
  const helperText =
    lang === "en"
      ? `Talk about your hobbies using the word below in ${duration} seconds.`
      : `Use the word below naturally while speaking about yourself for ${duration} seconds.`;

  return (
    <div className="mt-4">
      {word && (
        <div className="mb-5 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-lg font-medium text-slate-800">
          {helperText}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          {isRecording && (
            <div className="mb-3 flex items-center justify-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-semibold text-red-600">Recording…</span>
            </div>
          )}

          <div className="flex min-h-[140px] flex-col items-center justify-center">
            <div className="text-5xl font-bold tracking-tight text-slate-900">
              {word || "—"}
            </div>

            {(ipa || pos) && lang === "en" && (
              <div className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-500">
                {ipa && <span className="font-mono text-lg text-slate-700">/{ipa}/</span>}
                {ipa && pos && <span className="text-slate-300">|</span>}
                {pos && (
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {pos}
                  </span>
                )}
              </div>
            )}

            {lang === "ko" && meaning && (
              <div className="mt-1 text-sm leading-6 text-slate-600">{meaning}</div>
            )}
          </div>

          {word && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <ActionButton
                onClick={isRecording ? onStop : onRecord}
                disabled={isRecording ? !canStop : !canRecord}
                label={isRecording ? "Stop Recording" : "Start Recording"}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                {isRecording ? <FiSquare size={20} /> : <FiMic size={20} />}
              </ActionButton>

              <ActionButton
                onClick={onRecordAgain}
                disabled={!canRecordAgain}
                label="Record Again"
                className="bg-amber-400 text-white hover:bg-amber-500"
              >
                <FiRotateCcw size={20} />
              </ActionButton>

              <ActionButton
                onClick={onDownload}
                disabled={!canDownload}
                label="Download Recording"
                className="bg-slate-700 text-white hover:bg-slate-800"
              >
                <FiDownload size={20} />
              </ActionButton>

              <ActionButton
                onClick={onFeedback}
                disabled={!canFeedback}
                label="Get AI Feedback"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <FiMessageCircle size={20} />
              </ActionButton>
            </div>
          )}
        </div>

        <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex min-h-[180px] items-center justify-center">
            {timer}
          </div>
        </div>
      </div>
    </div>
  );
}