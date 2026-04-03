"use client";

import React from "react";

interface FeedbackResult {
  transcript: string;
  wordCount: number;
  usedRandomWord: boolean;
  topicName?: string;
  topic_relevance: {
    status: "on_topic" | "not_on_topic";
    reason: string;
  };
  expression_fixes: Array<{
    original: string;
    suggested: string;
  }>;
  opic_assessment: {
    improvement_points: string[];
  };
  suggested_transcript: string;
  encouragement: {
    quote: string;
    author: string;
  };
}

interface FeedbackPanelProps {
  result: FeedbackResult | null;
}

export default function FeedbackPanel({ result }: FeedbackPanelProps) {
  if (!result) return null;

  const isOnTopic = result.topic_relevance?.status === "on_topic";

  return (
    <div id="ai-feedback-section" className="mt-6 p-5 bg-white rounded-xl shadow border border-gray-200">
      <h3 className="text-lg font-bold mb-2 text-gray-800">AI Feedback</h3>

      <div className="mb-3">
        <p className="font-semibold text-gray-900 mb-1">Transcript:</p>
        <p className="text-gray-700">{result.transcript || "(empty)"}</p>
      </div>

      <div className="mb-3 text-sm text-gray-700 space-y-1">
        <p className="font-semibold text-gray-900 mb-1">General</p>
        <p>Total words spoken: {result.wordCount}</p>
        <p>
          Random word used: {result.usedRandomWord ? "Yes ✅" : "No ❌"}
        </p>
        <p>
          Topic fit ({result.topicName || "selected topic"}):{" "}
          <span className={isOnTopic ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
            {isOnTopic ? "On topic" : "Not on topic"}
          </span>
        </p>
        <p className="text-gray-600">{result.topic_relevance?.reason}</p>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-red-600 mb-1">Expression fixes:</p>
        {result.expression_fixes?.length ? (
          <ul className="list-disc pl-5 text-gray-800 space-y-1">
            {result.expression_fixes.map((fix, idx) => (
              <li key={`${fix.original}-${idx}`}>
                <span className="line-through text-red-500">{fix.original}</span>
                {" → "}
                <span className="text-green-700">{fix.suggested}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No major expression issues found.</p>
        )}
      </div>

      <div className="mb-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
        <p className="font-semibold text-slate-800 mb-2">How to improve for OPIc</p>
        <ul className="list-disc pl-5 text-sm text-slate-700">
          {(result.opic_assessment?.improvement_points || []).map((s, i) => (
            <li key={`imp-${i}`}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-gray-900 mb-1">Suggested transcript</p>
        <p className="text-gray-700">{result.suggested_transcript}</p>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
        <p className="font-semibold text-indigo-700 mb-1">Daily motivation</p>
        <p className="text-indigo-900 italic">“{result.encouragement?.quote}”</p>
        <p className="text-indigo-700 text-sm mt-1">— {result.encouragement?.author}</p>
      </div>
    </div>
  );
}
