"use client";

import { useEffect, useMemo, useState } from "react";
import type { AyahWords } from "@repo/quran-data";
import { alignLive, type LiveResult } from "@repo/utils";
import { createLiveSession } from "@/lib/api";
import { liveRecognitionSupported, startLiveRecognizer } from "@/lib/live-recognizer";

export type LiveFeedbackStatus = "off" | "connecting" | "live" | "unavailable";

interface Options {
  /** Microphone stream of the recording in progress */
  stream: MediaStream | null;
  recording: boolean;
  ayah: AyahWords;
  /** Identifies the ayah being recited; the transcript restarts when it changes */
  ayahKey: string;
}

/**
 * Word-by-word feedback while the user recites. Streams the microphone to the
 * recognizer and re-aligns the transcript heard so far against the ayah.
 * Failures never block recording: the full grading after the recording is
 * unaffected and the UI just reports that live feedback is unavailable.
 */
export function useLiveFeedback({ stream, recording, ayah, ayahKey }: Options) {
  const [status, setStatus] = useState<LiveFeedbackStatus>("off");
  const [transcript, setTranscript] = useState("");
  const [owner, setOwner] = useState(ayahKey);
  const [wasRecording, setWasRecording] = useState(false);

  // A different ayah starts with a clean slate.
  if (owner !== ayahKey) {
    setOwner(ayahKey);
    setTranscript("");
    setStatus("off");
  }

  // Each new recording starts a fresh transcript.
  if (recording !== wasRecording) {
    setWasRecording(recording);
    if (recording) {
      setTranscript("");
      setStatus("connecting");
    }
  }

  useEffect(() => {
    if (!recording || !stream) return;
    if (!liveRecognitionSupported()) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    const controller = new AbortController();

    (async () => {
      try {
        const session = await createLiveSession({ signal: controller.signal });
        if (cancelled) return;
        const recognizer = await startLiveRecognizer(session, stream, {
          onText: (text) => !cancelled && setTranscript(text),
          onError: () => !cancelled && setStatus("unavailable"),
        });
        if (cancelled) recognizer.stop();
        else {
          stop = recognizer.stop;
          setStatus("live");
        }
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      stop?.();
    };
  }, [recording, stream]);

  // Recording on a browser without AudioWorklet/WebSocket: no live feedback.
  const unsupported = recording && typeof window !== "undefined" && !liveRecognitionSupported();
  const effectiveStatus: LiveFeedbackStatus = unsupported ? "unavailable" : status;

  const live: LiveResult | null = useMemo(
    () => (effectiveStatus === "off" && !transcript ? null : alignLive(ayah, transcript)),
    [ayah, transcript, effectiveStatus],
  );

  return { status: effectiveStatus, transcript, live };
}
