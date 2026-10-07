'use client';

import { useState, useRef } from 'react';
import { Header } from './header';
import { AudioRecorder } from './audio-recorder';
import { SurahSelector } from './surah-selector';
import { RecitationResults } from './recitation-results';
import { Button } from '@/components/ui/button';
import { Loader2, Mic } from 'lucide-react';

// Mock verse data for demonstration
const VERSE_DATA: Record<string, Record<number, string>> = {
  '1': {
    1: 'الحمد لله رب العالمين',
    2: 'الرحمن الرحيم',
    3: 'مالك يوم الدين',
    4: 'إياك نعبد وإياك نستعين',
    5: 'اهدنا الصراط المستقيم',
    6: 'صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين',
  },
  '36': {
    1: 'يس',
    2: 'والقرآن الحكيم',
    3: 'إنك لمن المرسلين',
  },
  '112': {
    1: 'قل هو الله أحد',
    2: 'الله الصمد',
    3: 'لم يلد ولم يولد',
    4: 'ولم يكن له كفوا أحد',
  },
};

interface WordResult {
  word: string;
  status: 'correct' | 'incorrect' | 'missing';
  expected?: string;
}

interface Error {
  type: 'missing' | 'wrong' | 'extra';
  word: string;
  expected?: string;
  message: string;
}

interface EvaluationResult {
  accuracy: number;
  transcribedText: string;
  expectedText: string;
  wordResults: WordResult[];
  errors: Error[];
  audioUrl: string;
}

export function RecitationEvaluator() {
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [selectedAyah, setSelectedAyah] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<'single' | 'complete' | 'fromBeginning'>('single');
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const audioUrlRef = useRef<string>('');

  const verseText =
    selectedSurah && selectedAyah
      ? VERSE_DATA[selectedSurah.toString()]?.[selectedAyah]
      : '';

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setRecordedAudio(audioBlob);

    if (selectedSurah && selectedAyah) {
      await evaluateRecitation(audioBlob);
    }
  };

  const evaluateRecitation = async (audioBlob: Blob) => {
    setIsEvaluating(true);
    
    // Create audio URL for playback
    const url = URL.createObjectURL(audioBlob);
    audioUrlRef.current = url;

    // 🔌 API INTEGRATION NEEDED:
    // This function needs to call your backend API with:
    // 1. Audio blob - convert to FormData and send to API
    // 2. selectedMode - 'single', 'complete', or 'fromBeginning'
    // 3. selectedSurah - surah number
    // 4. selectedAyah - ayah number (if applicable)
    // 
    // API should return:
    // - Transcribed text from speech-to-text service (e.g., Whisper, Google Cloud Speech)
    // - Compare against Qur'anic text API
    // - Return word-by-word accuracy, errors with corrections, and overall accuracy percentage

    // Simulate API call with delay (remove in production)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // MOCK EVALUATION - Replace with real API call
    const expectedText = verseText;
    const mockTranscribedText = 'الحمد لل رب العالمين'; // Intentional error for demo

    const mockResult: EvaluationResult = {
      accuracy: 85,
      transcribedText: mockTranscribedText,
      expectedText: expectedText,
      wordResults: [
        { word: 'الحمد', status: 'correct' },
        { word: 'لل', status: 'incorrect', expected: 'لله' },
        { word: 'رب', status: 'correct' },
        { word: 'العالمين', status: 'correct' },
      ],
      errors: [
        {
          type: 'wrong',
          word: 'لل',
          expected: 'لله',
          message: 'You said "لل" instead of "لله"',
        },
      ],
      audioUrl: url,
    };

    setResult(mockResult);
    setIsEvaluating(false);
  };

  const handleTryAgain = () => {
    setRecordedAudio(null);
    setResult(null);
    setSelectedAyah(null);
  };

  const handleReset = () => {
    setSelectedSurah(null);
    setSelectedAyah(null);
    setSelectedMode('single');
    setRecordedAudio(null);
    setResult(null);
  };

  const canRecordRecitation = selectedSurah && (selectedMode === 'complete' || selectedAyah);

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background flex flex-col">
      <Header />

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Step 1: Select Surah & Recitation Mode */}
          {!result && (
            <>
              <SurahSelector
                selectedSurah={selectedSurah}
                selectedAyah={selectedAyah}
                selectedMode={selectedMode}
                onSurahChange={setSelectedSurah}
                onAyahChange={setSelectedAyah}
                onModeChange={setSelectedMode}
                verseText={verseText}
              />

              {/* Step 2: Display Full Qur'anic Text with Error Highlighting */}
              {canRecordRecitation && !recordedAudio && !result && (
                <div className="bg-card rounded-lg border border-border p-8 min-h-96">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                    Qur&apos;anic Text - Recite what you see below
                  </p>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-2xl leading-relaxed text-foreground text-right font-arabic">
                      {verseText}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-6 text-center">
                    Areas highlighted in red during feedback show incorrect or missing words
                  </p>
                </div>
              )}

              {/* Step 3: Record Audio with Begin Recitation Button */}
              {canRecordRecitation && !recordedAudio && !result && (
                <>
                  <AudioRecorder
                    onRecordingComplete={handleRecordingComplete}
                    isEvaluating={isEvaluating}
                  />
                  {/* Full-width Begin Recitation Button at Bottom */}
                  <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent pt-6 pb-4 -mx-4 px-4">
                    <Button
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-lg py-6"
                    >
                      <Mic className="w-6 h-6" />
                      Begin Recitation
                    </Button>
                  </div>
                </>
              )}

              {/* Evaluation Status */}
              {isEvaluating && (
                <div className="bg-card rounded-lg border border-border p-8 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">Evaluating your recitation...</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      🔌 Processing audio and comparing against Qur&apos;anic text. Please wait.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Results */}
          {result && (
            <>
              <RecitationResults
                accuracy={result.accuracy}
                transcribedText={result.transcribedText}
                expectedText={result.expectedText}
                wordResults={result.wordResults}
                errors={result.errors}
                audioUrl={result.audioUrl}
                onTryAgain={handleTryAgain}
                isLoading={isEvaluating}
              />

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full"
              >
                Try Different Verse
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
