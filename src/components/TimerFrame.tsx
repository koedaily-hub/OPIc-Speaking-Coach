"use client";

import React, { useEffect, useState } from "react";

interface TimerFrameProps {
  duration: number;
  active: boolean;
  onFinish?: () => void;
  timeUpSignal?: number;
}

export default function TimerFrame({
  duration,
  active,
  onFinish,
  timeUpSignal,
}: TimerFrameProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!active) return;

    setTimeLeft(duration);

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          onFinish?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [active, duration, timeUpSignal]);

  return (
    <div
      className={`absolute inset-0 rounded-xl border-2 pointer-events-none ${
        timeLeft <= 3 && active ? "border-rose-300" : "border-slate-300"
      }`}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="rounded-xl bg-white/90 px-8 py-6 text-center">
          <p className="text-5xl font-semibold tabular-nums tracking-tight text-slate-800 sm:text-6xl">
            {timeLeft}
          </p>
        </div>
      </div>
    </div>
  );
}
