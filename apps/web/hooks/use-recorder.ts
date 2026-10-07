"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderErrorCode =
  | "denied"
  | "no-microphone"
  | "busy"
  | "insecure-context"
  | "unsupported"
  | "too-short"
  | "failed";

export class RecorderError extends Error {
  constructor(
    readonly code: RecorderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RecorderError";
  }
}

const MESSAGES: Record<RecorderErrorCode, string> = {
  denied:
    "Microphone access is blocked. Allow microphone access for this site in your browser settings, then try again.",
  "no-microphone": "No microphone was found. Connect one and try again.",
  busy: "Your microphone is being used by another app. Close it and try again.",
  "insecure-context": "Recording needs a secure (https) connection.",
  unsupported: "This browser can't record audio. Try a recent version of Chrome, Safari, Edge or Firefox.",
  "too-short": "That recording was too short. Hold on until you've finished the ayah, then tap stop.",
  failed: "Recording failed. Please try again.",
};

const recorderError = (code: RecorderErrorCode) => new RecorderError(code, MESSAGES[code]);

// Preferred formats: Opus/WebM (Chrome, Firefox, Android) then MP4 (Safari/iOS).
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const MIN_DURATION_MS = 500;

export type RecorderStatus = "idle" | "starting" | "recording";

export interface UseRecorderOptions {
  /** Stop automatically after this many seconds (default 180, enough for 2:282). */
  maxSeconds?: number;
  /** Called with the recording when it stops automatically at maxSeconds. */
  onAutoStop?: (audio: Blob) => void;
}

function mapGetUserMediaError(error: unknown): RecorderError {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return recorderError("denied");
  if (name === "NotFoundError" || name === "OverconstrainedError") return recorderError("no-microphone");
  if (name === "NotReadableError" || name === "AbortError") return recorderError("busy");
  return recorderError("failed");
}

export function useRecorder({ maxSeconds = 180, onAutoStop }: UseRecorderOptions = {}) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopResolverRef = useRef<((blob: Blob) => void) | null>(null);
  const onAutoStopRef = useRef(onAutoStop);
  useEffect(() => {
    onAutoStopRef.current = onAutoStop;
  }, [onAutoStop]);

  const teardown = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop()); // release the mic
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    recorderRef.current = null;
    setLevel(0);
    setStatus("idle");
  }, []);

  useEffect(() => () => {
    // Leaving the page: discard any recording in progress.
    stopResolverRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    teardown();
  }, [teardown]);

  const stop = useCallback((): Promise<Blob> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      return Promise.reject(recorderError("failed"));
    }
    const duration = Date.now() - startedAtRef.current;
    return new Promise<Blob>((resolve, reject) => {
      stopResolverRef.current = (blob) => {
        if (duration < MIN_DURATION_MS || blob.size === 0) reject(recorderError("too-short"));
        else resolve(blob);
      };
      recorder.stop();
    });
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    if (typeof window !== "undefined" && !window.isSecureContext) throw recorderError("insecure-context");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw recorderError("unsupported");
    }

    setStatus("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
    } catch (error) {
      setStatus("idle");
      throw mapGetUserMediaError(error);
    }

    const mimeType = MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setStatus("idle");
      throw recorderError("unsupported");
    }

    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
      const resolve = stopResolverRef.current;
      stopResolverRef.current = null;
      teardown();
      if (resolve) resolve(blob);
      else if (blob.size > 0) onAutoStopRef.current?.(blob); // reached maxSeconds
    };

    // Live input level for visual feedback (best effort).
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      const data = new Uint8Array(analyser.fftSize);
      let lastUpdate = 0;
      const loop = (t: number) => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        if (t - lastUpdate > 60) {
          setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
          lastUpdate = t;
        }
        frameRef.current = requestAnimationFrame(loop);
      };
      frameRef.current = requestAnimationFrame(loop);
    } catch {
      // No Web Audio: recording still works, just without the level meter.
    }

    startedAtRef.current = Date.now();
    setElapsed(0);
    tickRef.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(seconds);
      if (seconds >= maxSeconds && recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, 250);

    recorder.start(250);
    setStatus("recording");
  }, [maxSeconds, teardown]);

  /** Stop and throw the recording away. */
  const cancel = useCallback(() => {
    stopResolverRef.current = null;
    chunksRef.current = [];
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.onstop = () => teardown();
      recorderRef.current.stop();
    } else {
      teardown();
    }
  }, [teardown]);

  return { status, elapsed, level, start, stop, cancel };
}
