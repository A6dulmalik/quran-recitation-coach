"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PlayerStatus = "idle" | "loading" | "playing" | "error";

interface PlayerState {
  src: string | null;
  status: PlayerStatus;
}

/**
 * One audio element per page: playing a new source stops the previous one,
 * and playing the current source again stops it (toggle).
 */
export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [player, setPlayer] = useState<PlayerState>({ src: null, status: "idle" });

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    const onPlaying = () => setPlayer((p) => ({ ...p, status: "playing" }));
    const onEnded = () => setPlayer({ src: null, status: "idle" });
    const onError = () => setPlayer((p) => (p.src ? { ...p, status: "error" } : p));
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setPlayer({ src: null, status: "idle" });
  }, []);

  const toggle = useCallback(
    (src: string) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (player.src === src && (player.status === "playing" || player.status === "loading")) {
        stop();
        return;
      }
      setPlayer({ src, status: "loading" });
      audio.src = src;
      audio.play().catch((error: unknown) => {
        // AbortError: superseded by another play() — not a failure.
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setPlayer((p) => (p.src === src ? { ...p, status: "error" } : p));
        }
      });
    },
    [player, stop],
  );

  const statusFor = useCallback(
    (src: string): PlayerStatus => (src === player.src ? player.status : "idle"),
    [player],
  );

  return { toggle, stop, statusFor };
}
