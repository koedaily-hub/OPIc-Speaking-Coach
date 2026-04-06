"use client";

import React from "react";
import {
  FiRotateCcw,
  FiMic,
  FiSquare,
  FiDownload,
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
  canRecord: boolean;
  canStop: boolean;
  canRecordAgain: boolean;
  canDownload: boolean;
}

type ActionButtonProps = {
  onClick: () => void;
  disabled: boolean;
  label: string;
  className: string;
  isActive?: boolean;
  children: React.ReactNode;
};

function ActionButton({
  onClick,
  disabled,
  label,
  className,
  isActive = false,
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
          isActive ? "animate-pulse ring-2 ring-red-300/80 ring-offset-2 ring-offset-white" : "",
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
  canRecord,
  canStop,
  canRecordAgain,
  canDownload,
}: RandomWordProps) {
  const topicPhrase = topicLabel ? topicLabel.toLowerCase() : "hobbies";

  return (
    <div className="mt-4">
      {word && (
        <div className="mb-5 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-lg font-medium text-slate-800">
          {lang === "en" ? (
            <>
              Talk about your <strong>{topicPhrase}</strong> using the word below in {duration} seconds.
            </>
          ) : (
            <>Use the word below naturally while speaking about yourself for {duration} seconds.</>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm sm:p-4">
          <div className="flex min-h-[96px] flex-col items-center justify-center pt-4">
            <div className="text-5xl font-bold tracking-tight text-slate-900">
              {word || "—"}
            </div>

            {(ipa || pos) && lang === "en" && (
              <div className="mt-0.5 flex items-center justify-center gap-2 text-sm text-slate-500">
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
              <div className="mt-0.5 text-sm leading-6 text-slate-600">{meaning}</div>
            )}
          </div>

          {word && (
            <div className="mt-3 flex items-center justify-center gap-2.5">
              <ActionButton
                onClick={isRecording ? onStop : onRecord}
                disabled={isRecording ? !canStop : !canRecord}
                label={isRecording ? "Stop Recording" : "Start Recording"}
                className="bg-red-500 text-white hover:bg-red-600"
                isActive={isRecording}
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

            </div>
          )}
        </div>

        <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex min-h-[140px] items-center justify-center">
            {timer}
          </div>
        </div>
      </div>
    </div>
  );
}