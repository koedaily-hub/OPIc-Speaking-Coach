"use client";

import React from "react";

interface FeedbackResult {
  highlight: string;
  sample: string;
  speed_wpm: number;
  pause_count: number;
  clarity: number;
}

interface FeedbackPanelProps {
  result: FeedbackResult | null;
}

export default function FeedbackPanel({ result }: FeedbackPanelProps) {
  if (!result) return null;

  return (
    <div className="mt-6 p-5 bg-white rounded-xl shadow border border-gray-200">
      <h3 className="text-lg font-bold mb-2 text-gray-800">AI Feedback</h3>

      <div className="mb-3">
        <p className="font-semibold text-red-600 mb-1">Mistakes / Highlights:</p>
        {/* highlight có thể chứa <b> ... </b> */}
        <p
          className="text-gray-800"
          dangerouslySetInnerHTML={{ __html: result.highlight }}
        />
      </div>

      <div className="mb-3">
        <p className="font-semibold text-indigo-600 mb-1">Suggested answer:</p>
        <p className="text-gray-800">{result.sample}</p>
      </div>

      <div className="mt-4 text-sm text-gray-700 space-y-1">
        <p>Speed: {result.speed_wpm} words/min</p>
        <p>Pauses: {result.pause_count}</p>
        <p>Clarity score: {result.clarity}/10</p>
      </div>
    </div>
  );
}
