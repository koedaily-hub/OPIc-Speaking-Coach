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
      className={`absolute inset-0 border-4 rounded-xl pointer-events-none ${
        timeLeft <= 3 && active
          ? "animate-pulse border-red-500"
          : "border-emerald-500"
      }`}
    >
      {/* Bubble thời gian */}
      <div
        className="
          absolute -top-4 left-4 bg-white border border-gray-300
          text-xs px-3 py-0.5 rounded-full shadow z-10
        "
      >
        {timeLeft}s
      </div>
    </div>
  );
}
