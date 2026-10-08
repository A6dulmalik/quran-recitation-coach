"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WordStatus =
  | "pending"
  | "active"
  | "correct"
  | "incorrect"
  | "missing";

export type WordState = {
  text: string;
  status: WordStatus;
  /** Original expected text, stored when marked incorrect */
  expected?: string;
};

export type VerseState = {
  verseNumber: number;
  words: WordState[];
  status: "idle" | "active" | "completed";
};

export type RecitationState =
  | "idle"
  | "listening"
  | "paused"
  | "paused_on_error"
  | "completed";

/**
 * "simulation" – the engine drives itself with a timer (800 ms / word).
 * "real"       – no internal timer; the caller drives the engine by calling
 *                markWordCorrect() / markWordIncorrect() from a speech pipeline.
 */
export type RecitationMode = "simulation" | "real";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/** One ayah to recite: its number and Uthmani display words. */
export interface EngineAyah {
  number: number;
  words: string[];
}

export function buildVerses(ayahs: EngineAyah[]): VerseState[] {
  return ayahs.map((ayah) => ({
    verseNumber: ayah.number,
    status: "idle" as const,
    words: ayah.words.map((text) => ({ text, status: "pending" as const })),
  }));
}

const INCORRECT_WORD_CHANCE = 0.2;

// ---------------------------------------------------------------------------
// Hook options & return type
// ---------------------------------------------------------------------------

export interface UseRecitationEngineOptions {
  /** Ayahs to recite, in order. Changing this requires remounting the hook. */
  ayahs: EngineAyah[];
  /** Defaults to "simulation" */
  mode?: RecitationMode;
  /** Optional callback fired whenever the active word changes. */
  onWordChange?: (wordIndex: number, verseIndex: number) => void;
  /** Optional callback fired whenever a word is marked incorrect. */
  onError?: (wordIndex: number, verseIndex: number) => void;
  /** Optional callback fired when recitation is completed. */
  onComplete?: () => void;
}

export interface UseRecitationEngineReturn {
  // --- Readable state ---
  recitationState: RecitationState;
  verses: VerseState[];
  currentVerseIndex: number;
  currentWordIndex: number;
  incorrectWordIndex: number | null;
  duration: number;
  accuracy: number;

  // --- Engine controls ---
  /** Begin a new recitation session. */
  start: () => Promise<void>;
  /** Stop and fully reset the session. */
  stop: () => void;
  /** Pause the running timer (listening → paused). */
  pause: () => void;
  /** Resume after a manual pause (paused → listening). */
  resume: () => void;
  /**
   * After a word was marked incorrect the engine pauses on the error.
   * Calling this accepts the correction and resumes.
   */
  tryAgain: () => void;

  // --- Word-level API (the engine's core verbs) ---
  /**
   * Mark the next pending word as correct and advance the position.
   * In simulation mode this is called internally by the timer.
   * In real mode call this from your speech-recognition pipeline.
   */
  markWordCorrect: () => void;
  /**
   * Mark the next pending word as incorrect.
   * The engine pauses on the error and waits for tryAgain().
   * In real mode call this from your speech-recognition pipeline.
   */
  markWordIncorrect: () => void;
}

// ---------------------------------------------------------------------------
// useRecitationEngine
// ---------------------------------------------------------------------------

export function useRecitationEngine({
  ayahs,
  mode = "simulation",
  onWordChange,
  onError,
  onComplete,
}: UseRecitationEngineOptions): UseRecitationEngineReturn {
  // -------------------------------------------------------------------------
  // State (drives the render)
  // -------------------------------------------------------------------------
  const initialVerses = buildVerses(ayahs);

  const [recitationState, setRecitationState] =
    useState<RecitationState>("idle");
  const [duration, setDuration] = useState(0);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [incorrectWordIndex, setIncorrectWordIndex] = useState<number | null>(
    null,
  );
  const [accuracy, setAccuracy] = useState(0);
  const [, setTotalWords] = useState(0);
  const [, setCorrectWords] = useState(0);
  const [verses, setVerses] = useState<VerseState[]>(initialVerses);

  // -------------------------------------------------------------------------
  // Refs (live read channel for interval callbacks – avoids stale closures)
  // -------------------------------------------------------------------------
  const versesRef = useRef<VerseState[]>(initialVerses);
  const currentVerseIndexRef = useRef(0);
  const currentWordIndexRef = useRef(-1);
  const recitationStateRef = useRef<RecitationState>("idle");
  const totalWordsRef = useRef(0);
  const correctWordsRef = useRef(0);
  const activeWordRef = useRef<{
    verseIndex: number;
    wordIndex: number;
  } | null>(null);
  const hasCompletedRef = useRef(false);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const recitationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // -------------------------------------------------------------------------
  // Ref-synced state setters
  // Every piece of state that the timer needs to READ is mirrored in a ref.
  // React state setters are always stable so no deps needed in useCallback.
  // -------------------------------------------------------------------------
  const setVersesState = useCallback((next: VerseState[]) => {
    versesRef.current = next;
    setVerses(next);
  }, []);

  const setCurrentVerse = useCallback((index: number) => {
    currentVerseIndexRef.current = index;
    setCurrentVerseIndex(index);
  }, []);

  const setCurrentWord = useCallback((index: number) => {
    currentWordIndexRef.current = index;
    setCurrentWordIndex(index);
  }, []);

  const setRecitation = useCallback((next: RecitationState) => {
    recitationStateRef.current = next;
    setRecitationState(next);
  }, []);

  const recalculateAccuracy = useCallback(() => {
    const total = totalWordsRef.current;
    const correct = correctWordsRef.current;
    const nextAccuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
    setAccuracy(nextAccuracy);
  }, []);

  const bumpWordStats = useCallback(
    (isCorrect: boolean) => {
      totalWordsRef.current += 1;
      if (isCorrect) {
        correctWordsRef.current += 1;
      }
      setTotalWords(totalWordsRef.current);
      setCorrectWords(correctWordsRef.current);
      recalculateAccuracy();
    },
    [recalculateAccuracy],
  );

  // -------------------------------------------------------------------------
  // Timer management
  // -------------------------------------------------------------------------
  const clearTimers = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (recitationIntervalRef.current) {
      clearInterval(recitationIntervalRef.current);
      recitationIntervalRef.current = null;
    }
  }, []);

  const stopMediaRecorder = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  const clearActiveWordStatuses = useCallback((nextVerses: VerseState[]) => {
    return nextVerses.map((verse) => ({
      ...verse,
      words: verse.words.map((word) =>
        word.status === "active" ?
          { ...word, status: "pending" as const }
        : word,
      ),
    }));
  }, []);

  const getNextWordPosition = useCallback(() => {
    const allVerses = versesRef.current;
    if (allVerses.length === 0) return null;

    let verseIndex = currentVerseIndexRef.current;
    let wordIndex = currentWordIndexRef.current + 1;

    while (verseIndex < allVerses.length) {
      const verse = allVerses[verseIndex];
      if (!verse || verse.words.length === 0) {
        verseIndex += 1;
        wordIndex = 0;
        continue;
      }
      if (wordIndex < verse.words.length) {
        return { verseIndex, wordIndex };
      }
      verseIndex += 1;
      wordIndex = 0;
    }

    return null;
  }, []);

  const applyVerseStatuses = useCallback(
    (
      nextVerses: VerseState[],
      activeVerseIndex: number,
      isCompleted: boolean,
    ): VerseState[] => {
      return nextVerses.map((verse, idx) => {
        if (isCompleted || idx < activeVerseIndex) {
          return { ...verse, status: "completed" as const };
        }
        if (idx === activeVerseIndex) {
          return { ...verse, status: "active" as const };
        }
        return { ...verse, status: "idle" as const };
      });
    },
    [],
  );

  const setActiveWord = useCallback(
    (verseIndex: number, wordIndex: number) => {
      const currentVerses = versesRef.current;
      const verse = currentVerses[verseIndex];
      const word = verse?.words[wordIndex];
      if (!verse || !word) return false;

      const withoutActive = clearActiveWordStatuses(currentVerses);
      const withActive = withoutActive.map((v, vIdx) => {
        if (vIdx !== verseIndex) return v;
        return {
          ...v,
          words: v.words.map((w, wIdx) =>
            wIdx === wordIndex ? { ...w, status: "active" as const } : w,
          ),
        };
      });

      setVersesState(applyVerseStatuses(withActive, verseIndex, false));
      setCurrentVerse(verseIndex);
      setCurrentWord(wordIndex - 1);
      activeWordRef.current = { verseIndex, wordIndex };
      onWordChange?.(wordIndex, verseIndex);
      return true;
    },
    [
      applyVerseStatuses,
      clearActiveWordStatuses,
      onWordChange,
      setCurrentVerse,
      setCurrentWord,
      setVersesState,
    ],
  );

  // -------------------------------------------------------------------------
  // Engine core: advance one word
  //
  // This is the single function that both modes use.
  //   - Simulation mode: the interval calls markWordCorrect/Incorrect → advanceWord
  //   - Real mode:       the speech pipeline calls markWordCorrect/Incorrect → advanceWord
  //
  // It reads position and verses exclusively from refs so it is always fresh
  // regardless of when the interval closure was created.
  // -------------------------------------------------------------------------
  const completeRecitation = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    activeWordRef.current = null;
    clearTimers();
    setRecitation("completed");
    onComplete?.();
  }, [clearTimers, onComplete, setRecitation]);

  const finalizeIfDoneOrActivateNext = useCallback(() => {
    const nextPosition = getNextWordPosition();
    if (!nextPosition) {
      const allCompleted = applyVerseStatuses(versesRef.current, 0, true).map(
        (verse) => ({
          ...verse,
          words: verse.words.map((word) =>
            word.status === "active" ?
              { ...word, status: "pending" as const }
            : word,
          ),
        }),
      );
      setVersesState(allCompleted);
      completeRecitation();
      return;
    }

    setActiveWord(nextPosition.verseIndex, nextPosition.wordIndex);
  }, [
    applyVerseStatuses,
    completeRecitation,
    getNextWordPosition,
    setActiveWord,
    setVersesState,
  ]);

  const evaluateWordAtPosition = useCallback(
    (isCorrect: boolean, verseIndex: number, wordIndex: number) => {
      const allVerses = versesRef.current;
      const verse = allVerses[verseIndex];
      const targetWord = verse?.words[wordIndex];
      if (!verse || !targetWord) {
        completeRecitation();
        return;
      }

      const withoutActive = clearActiveWordStatuses(allVerses);
      const evaluated = withoutActive.map((v, vIdx) => {
        if (vIdx !== verseIndex) return v;
        return {
          ...v,
          words: v.words.map((w, wIdx) => {
            if (wIdx !== wordIndex) return w;
            return {
              ...w,
              status: isCorrect ? ("correct" as const) : ("incorrect" as const),
              expected: isCorrect ? w.expected : w.text,
            };
          }),
        };
      });

      setVersesState(applyVerseStatuses(evaluated, verseIndex, false));
      setCurrentVerse(verseIndex);
      setCurrentWord(wordIndex);
      activeWordRef.current = null;
      bumpWordStats(isCorrect);

      if (!isCorrect) {
        clearTimers();
        setIncorrectWordIndex(wordIndex);
        setRecitation("paused_on_error");
        onError?.(wordIndex, verseIndex);
        return;
      }

      setIncorrectWordIndex(null);
      finalizeIfDoneOrActivateNext();
    },
    [
      applyVerseStatuses,
      bumpWordStats,
      clearActiveWordStatuses,
      clearTimers,
      completeRecitation,
      finalizeIfDoneOrActivateNext,
      onError,
      setCurrentVerse,
      setCurrentWord,
      setRecitation,
      setVersesState,
    ],
  );

  const getCurrentOrNextPosition = useCallback(() => {
    const active = activeWordRef.current;
    if (active) {
      const verse = versesRef.current[active.verseIndex];
      const word = verse?.words[active.wordIndex];
      if (verse && word) return active;
    }
    return getNextWordPosition();
  }, [getNextWordPosition]);

  /**
   * Advance the engine by one word.
   * @param isCorrect - whether the word was recited correctly
   */
  const advanceWord = useCallback(
    (isCorrect: boolean) => {
      const position = getCurrentOrNextPosition();
      if (!position) {
        completeRecitation();
        return;
      }

      evaluateWordAtPosition(
        isCorrect,
        position.verseIndex,
        position.wordIndex,
      );
    },
    [completeRecitation, evaluateWordAtPosition, getCurrentOrNextPosition],
  );

  // -------------------------------------------------------------------------
  // Public word-level API
  // These are what the simulation timer (or future speech pipeline) call.
  // -------------------------------------------------------------------------
  const markWordCorrect = useCallback(() => {
    advanceWord(true);
  }, [advanceWord]);

  const markWordIncorrect = useCallback(() => {
    advanceWord(false);
  }, [advanceWord]);

  // -------------------------------------------------------------------------
  // Simulation tick: randomly decide correct / incorrect and call the API
  // -------------------------------------------------------------------------
  const runSimulationTick = useCallback(() => {
    if (recitationStateRef.current !== "listening") return;

    if (versesRef.current.length === 0) {
      completeRecitation();
      return;
    }

    // Step 1: if no active word, activate the next one and wait for next tick.
    if (!activeWordRef.current) {
      const nextPosition = getNextWordPosition();
      if (!nextPosition) {
        completeRecitation();
        return;
      }
      setActiveWord(nextPosition.verseIndex, nextPosition.wordIndex);
      return;
    }

    // Step 2: evaluate the active word on the next tick.
    const isIncorrect = Math.random() < INCORRECT_WORD_CHANCE;
    advanceWord(!isIncorrect);
  }, [advanceWord, completeRecitation, getNextWordPosition, setActiveWord]);

  // -------------------------------------------------------------------------
  // Timer starter – respects mode
  // -------------------------------------------------------------------------
  const startTimers = useCallback(() => {
    durationIntervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    if (mode === "simulation") {
      // Engine drives itself
      recitationIntervalRef.current = setInterval(runSimulationTick, 800);
    }
    // In "real" mode no recitation interval is started.
    // The external speech pipeline will call markWordCorrect/markWordIncorrect.
  }, [mode, runSimulationTick]);

  // -------------------------------------------------------------------------
  // Session controls
  // -------------------------------------------------------------------------
  const start = useCallback(async () => {
    stopMediaRecorder();
    clearTimers();
    hasCompletedRef.current = false;
    activeWordRef.current = null;
    recitationStateRef.current = "idle";

    setDuration(0);
    setAccuracy(0);
    totalWordsRef.current = 0;
    correctWordsRef.current = 0;
    setTotalWords(0);
    setCorrectWords(0);
    setIncorrectWordIndex(null);
    setCurrentVerse(0);
    setCurrentWord(-1);

    const fresh = buildVerses(ayahs).map((v) => ({
      ...v,
      status: "idle" as const,
      words: v.words.map((word) => ({ ...word, status: "pending" as const })),
    }));
    setVersesState(fresh);

    if (fresh.length === 0) {
      setRecitation("completed");
      onComplete?.();
      return;
    }

    setRecitation("listening");
    setActiveWord(0, 0);

    // Only initialize media capture in real mode.
    if (mode === "real") {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.start();
      } catch {
        // Microphone unavailable; real-mode integrations can still push transcript results.
      }
    }

    startTimers();
  }, [
    clearTimers,
    mode,
    onComplete,
    setActiveWord,
    setCurrentVerse,
    setCurrentWord,
    setRecitation,
    setVersesState,
    startTimers,
    stopMediaRecorder,
    ayahs,
  ]);

  const stop = useCallback(() => {
    stopMediaRecorder();
    clearTimers();
    hasCompletedRef.current = false;
    activeWordRef.current = null;
    setRecitation("idle");
    setDuration(0);
    setAccuracy(0);
    totalWordsRef.current = 0;
    correctWordsRef.current = 0;
    setTotalWords(0);
    setCorrectWords(0);
    setIncorrectWordIndex(null);
    setCurrentVerse(0);
    setCurrentWord(-1);
    setVersesState(
      buildVerses(ayahs).map((verse) => ({
        ...verse,
        status: "idle" as const,
        words: verse.words.map((word) => ({
          ...word,
          status: "pending" as const,
        })),
      })),
    );
  }, [
    clearTimers,
    setCurrentVerse,
    setCurrentWord,
    setRecitation,
    setVersesState,
    stopMediaRecorder,
    ayahs,
  ]);

  const pause = useCallback(() => {
    if (recitationStateRef.current !== "listening") return;
    clearTimers();
    setRecitation("paused");
  }, [clearTimers, setRecitation]);

  const resume = useCallback(() => {
    if (recitationStateRef.current !== "paused") return;
    setRecitation("listening");
    startTimers();
  }, [setRecitation, startTimers]);

  const tryAgain = useCallback(() => {
    if (recitationStateRef.current !== "paused_on_error") return;

    const verseIdx = currentVerseIndexRef.current;
    const wordIdx = currentWordIndexRef.current;
    const verse = versesRef.current[verseIdx];
    const word = verse?.words[wordIdx];
    if (!verse || !word) {
      setRecitation("listening");
      startTimers();
      return;
    }

    // Mark the incorrect word as corrected and resume progression.
    const corrected = versesRef.current.map((v, vIdx) => {
      if (vIdx !== verseIdx) return v;
      return {
        ...v,
        words: v.words.map((w, wIdx) =>
          wIdx === wordIdx ?
            { ...w, status: "correct" as const, expected: w.expected }
          : w,
        ),
      };
    });

    setVersesState(applyVerseStatuses(corrected, verseIdx, false));

    // Convert the previous incorrect attempt into a corrected attempt.
    correctWordsRef.current += 1;
    setCorrectWords(correctWordsRef.current);
    recalculateAccuracy();

    setIncorrectWordIndex(null);
    setRecitation("listening");
    finalizeIfDoneOrActivateNext();
    startTimers();
  }, [
    applyVerseStatuses,
    finalizeIfDoneOrActivateNext,
    recalculateAccuracy,
    setRecitation,
    setVersesState,
    startTimers,
  ]);

  useEffect(() => {
    return () => {
      clearTimers();
      stopMediaRecorder();
    };
  }, [clearTimers, stopMediaRecorder]);

  // -------------------------------------------------------------------------
  // Return the public interface
  // -------------------------------------------------------------------------
  return {
    recitationState,
    verses,
    currentVerseIndex,
    currentWordIndex,
    incorrectWordIndex,
    duration,
    accuracy,
    start,
    stop,
    pause,
    resume,
    tryAgain,
    markWordCorrect,
    markWordIncorrect,
  };
}
