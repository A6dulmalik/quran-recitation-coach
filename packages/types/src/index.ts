export type RecitationMode = "simulation" | "real";

export type WordEvaluation = {
  verseIndex: number;
  wordIndex: number;
  isCorrect: boolean;
};

export type SessionSummary = {
  surah: number;
  startVerse: number;
  endVerse: number;
  accuracy: number;
};

export type WordStatus = "correct" | "incorrect" | "missing";

export type ComparedWord = {
  text: string;
  status: WordStatus;
  expected?: string;
};

export type ComparisonResult = {
  words: ComparedWord[];
  accuracy: number;
};
