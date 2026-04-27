'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, RotateCcw } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (audioData: Blob) => void;
  isEvaluating?: boolean;
}

export function AudioRecorder({ onRecordingComplete, isEvaluating }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);
        
        // Stop the stream
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
      
      setIsRecording(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  };

  const resetRecording = () => {
    setDuration(0);
    chunksRef.current = [];
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Recording Your Recitation</h2>
        
        <div className="flex flex-col items-center gap-6">
          {/* Waveform Animation */}
          <div className="flex items-center justify-center gap-1 h-16">
            {isRecording && (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-pulse"
                    style={{
                      height: `${20 + i * 12}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </>
            )}
            {!isRecording && duration === 0 && (
              <div className="text-center">
                <div className="text-4xl text-muted-foreground mb-2">🎙️</div>
              </div>
            )}
            {!isRecording && duration > 0 && (
              <div className="text-center">
                <p className="text-2xl font-mono font-bold text-primary">{formatDuration(duration)}</p>
              </div>
            )}
          </div>

          {/* Duration Display */}
          {isRecording && (
            <div className="text-center">
              <p className="text-lg font-mono font-bold text-primary">{formatDuration(duration)}</p>
              <p className="text-xs text-muted-foreground mt-1">Recording in progress...</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {!isRecording ? (
              <>
                <Button
                  onClick={startRecording}
                  disabled={isEvaluating}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <Mic className="w-5 h-5" />
                  Start Recording
                </Button>
                {duration > 0 && (
                  <Button
                    onClick={resetRecording}
                    variant="outline"
                    size="lg"
                    disabled={isEvaluating}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                )}
              </>
            ) : (
              <Button
                onClick={stopRecording}
                size="lg"
                variant="destructive"
                className="gap-2"
              >
                <Square className="w-5 h-5" />
                Stop Recording
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
