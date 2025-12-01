'use client'

import { useState, useRef } from 'react'

export default function RecordAudio() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [evaluation, setEvaluation] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const evaluateAudio = async () => {
    if (!audioBlob) return

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)

      const response = await fetch('/api/evaluate', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      setEvaluation(JSON.stringify(result, null, 2))
    } catch (error) {
      console.error('Error evaluating audio:', error)
    }
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Record Audio</h2>
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
        >
          Start Recording
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mb-4"
        >
          Stop Recording
        </button>
      )}
      {audioBlob && (
        <div className="mb-4">
          <audio controls src={URL.createObjectURL(audioBlob)} />
          <button
            onClick={evaluateAudio}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-2 block"
          >
            Evaluate Audio
          </button>
        </div>
      )}
      {evaluation && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-bold">Evaluation Result:</h3>
          <pre className="mt-2">{evaluation}</pre>
        </div>
      )}
    </div>
  )
}
