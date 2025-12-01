"use client";

import React from "react";
import {
  FiRotateCcw,
  FiMic,
  FiDownload,
  FiMessageCircle
} from "react-icons/fi";

interface RandomWordProps {
  word: string;
  ipa?: string;       // ⭐ NEW
  pos?: string;       // ⭐ NEW
  isRecording?: boolean; // ⭐ NEW to show indicator
  topicLabel: string;
  duration: number;
  timer: React.ReactNode;
  onRecord: () => void;
  onRecordAgain: () => void;
  onDownload: () => void;
  onFeedback: () => void;
}

export default function RandomWord({
  word,
  ipa,
  pos,
  isRecording,  // ⭐ NEW
  topicLabel,
  duration,
  timer,
  onRecord,
  onRecordAgain,
  onDownload,
  onFeedback
}: RandomWordProps) {

  return (
    <div className="mt-4">

      {/* ⭐ TEXT HƯỚNG DẪN */}
      {word && (
        <p className="text-center text-gray-700 text-sm mb-4 px-4 leading-relaxed">
          Share one personal detail about <strong>YOURSELF</strong> related to{" "}
          <strong>{topicLabel}</strong>, and include the random word below within{" "}
          <strong>{duration} seconds</strong>.
        </p>
      )}

      {/* ⭐ KHUNG RANDOM WORD + TIMER FRAME */}
      <div className="relative p-6 border rounded-xl shadow bg-white text-center">

        {/* Timer Frame */}
        {timer}
        
        {/* RECORDING DOT */}
          {isRecording && (
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
              <span className="text-xs text-red-600 font-semibold">Recording…</span>
            </div>
          )}

        {/* WORD */}
        <div className="text-4xl font-bold mt-6 text-gray-900">
          {word || "—"}
        </div>

      {/* IPA + POS (CÙNG HÀNG) */}
        {(ipa || pos) && (
          <div className="flex items-center justify-center gap-2 text-gray-600 text-sm mb-3">

            {/* IPA */}
            {ipa && (
              <span className="font-mono text-base text-gray-600">
                /{ipa}/
              </span>
            )}

            {/* separator */}
            {ipa && pos && <span className="text-gray-400">|</span>}

            {/* POS */}
            {pos && (
              <span className="uppercase tracking-wide text-xs text-gray-500">
                {pos}
              </span>
            )}

          </div>
        )}
        

        {/* ⭐ RECORDING INDICATOR */}
        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-600 rounded-full animate-ping"></span>
            <span className="text-xs text-red-600 font-semibold">Recording…</span>
          </div>
        )}


        {/* ICON BUTTONS */}
        {word && (
          <div className="absolute right-3 top-1 flex flex-col gap-1">

            {/* === RECORD === */}
            <div className="relative group">
              <button
                className="p-2 bg-red-500 text-white rounded-full shadow hover:bg-red-600"
                onClick={onRecord}
              >
                <FiMic size={10} />
              </button>

              <span className="
                absolute left-full ml-2 top-1/2 -translate-y-1/2
                opacity-0 group-hover:opacity-100 transition
                bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap
              ">
                Start Recording
              </span>
            </div>

            {/* === RECORD AGAIN === */}
            <div className="relative group">
              <button
                className="p-2 bg-yellow-400 text-white rounded-full shadow hover:bg-yellow-500"
                onClick={onRecordAgain}
              >
                <FiRotateCcw size={10} />
              </button>

              <span className="
                absolute left-full ml-2 top-1/2 -translate-y-1/2
                opacity-0 group-hover:opacity-100 transition
                bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap
              ">
                Record Again
              </span>
            </div>

            {/* === DOWNLOAD === */}
            <div className="relative group">
              <button
                className="p-2 bg-gray-700 text-white rounded-full shadow hover:bg-gray-800"
                onClick={onDownload}
              >
                <FiDownload size={10} />
              </button>

              <span className="
                absolute left-full ml-2 top-1/2 -translate-y-1/2
                opacity-0 group-hover:opacity-100 transition
                bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap
              ">
                Download Recording
              </span>
            </div>

            {/* === AI FEEDBACK === */}
            <div className="relative group">
              <button
                className="p-2 bg-green-600 text-white rounded-full shadow hover:bg-green-700"
                onClick={onFeedback}
              >
                <FiMessageCircle size={10} />
              </button>

              <span className="
                absolute left-full ml-2 top-1/2 -translate-y-1/2
                opacity-0 group-hover:opacity-100 transition
                bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap
              ">
                Get AI Feedback
              </span>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
