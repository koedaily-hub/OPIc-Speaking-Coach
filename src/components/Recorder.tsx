"use client";

import React, { useEffect, useState } from "react";

interface RecorderProps {
  timeUpSignal: number;
  resetSignal: number;
  onAudioReady: (blob: Blob) => void;
  onRecordingStateChange: (recording: boolean) => void;
  disabled?: boolean;
  recorderRef: React.RefObject<HTMLButtonElement>;
}

export default function Recorder({
  timeUpSignal,
  resetSignal,
  onAudioReady,
  onRecordingStateChange,
  disabled,
  recorderRef
}: RecorderProps) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] =
    useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    if (disabled) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    mr.ondataavailable = (e) => chunks.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/wav" });
      onAudioReady(blob);
      stream.getTracks().forEach((t) => t.stop());
    };

    mr.start();
    setMediaRecorder(mr);
    setRecording(true);
    onRecordingStateChange(true);
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setRecording(false);
    onRecordingStateChange(false);
  };

  // Reset
  useEffect(() => {
    stopRecording();
  }, [resetSignal]);

  // Auto stop when timer ends
  useEffect(() => {
    if (recording) stopRecording();
  }, [timeUpSignal]);

  // === HIDDEN BUTTON — NO BIG BUTTON ON UI ANYMORE ===
  return (
    <button
      ref={recorderRef}
      className="hidden"
      onClick={recording ? stopRecording : startRecording}
    />
  );
}
