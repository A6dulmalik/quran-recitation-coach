"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecordButtonState = "idle" | "starting" | "recording" | "evaluating";

interface RecordButtonProps {
  state: RecordButtonState;
  /** Microphone input level 0–1 while recording */
  level: number;
  onClick: () => void;
  disabled?: boolean;
}

const LABEL: Record<RecordButtonState, string> = {
  idle: "Start recording",
  starting: "Starting microphone",
  recording: "Stop recording",
  evaluating: "Checking your recitation",
};

export function RecordButton({ state, level, onClick, disabled }: RecordButtonProps) {
  const recording = state === "recording";
  const busy = state === "starting" || state === "evaluating";
  return (
    <div className="relative flex items-center justify-center">
      {recording && (
        <span
          aria-hidden
          className="absolute size-20 rounded-full bg-red-500/25 transition-transform duration-100 motion-reduce:transition-none"
          style={{ transform: `scale(${1 + level * 0.6})` }}
        />
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        aria-label={LABEL[state]}
        aria-pressed={recording}
        className={cn(
          "relative size-20 rounded-full flex items-center justify-center shadow-lg transition-all",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed",
          recording
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95",
          busy && "opacity-80",
        )}
      >
        {busy ? (
          <Loader2 className="size-8 animate-spin" aria-hidden />
        ) : recording ? (
          <Square className="size-7 fill-current" aria-hidden />
        ) : (
          <Mic className="size-8" aria-hidden />
        )}
      </button>
    </div>
  );
}
