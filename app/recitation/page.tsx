'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Mic, Square, RotateCcw, Play, Pause, ChevronLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// Sample Qur'anic verses for demo
const QURAN_DATA: Record<number, { verses: string[]; meaning: string }> = {
  1: {
    meaning: 'Al-Fatiha - The Opening',
    verses: [
      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
      'الرَّحْمَٰنِ الرَّحِيمِ',
      'مَالِكِ يَوْمِ الدِّينِ',
      'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
      'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
    ],
  },
  36: {
    meaning: 'Ya-Sin',
    verses: [
      'يس',
      'وَالْقُرْآنِ الْحَكِيمِ',
      'إِنَّكَ لَمِنَ الْمُرْسَلِينَ',
      'عَلَىٰ صِرَاطٍ مُسْتَقِيمٍ',
      'تَنزِيلَ الْعَزِيزِ الرَّحِيمِ',
    ],
  },
};

type WordStatus = 'default' | 'active' | 'correct' | 'incorrect' | 'missing';

interface Word {
  text: string;
  status: WordStatus;
  expected?: string;
}

interface VerseData {
  number: number;
  text: string;
  words: Word[];
}

export default function RecitationPage() {
  const searchParams = useSearchParams();
  const surahNum = parseInt(searchParams.get('surah') || '1');
  const mode = searchParams.get('mode') || 'full';
  const startVerse = parseInt(searchParams.get('start') || '1');
  const endVerse = parseInt(searchParams.get('end') || QURAN_DATA[surahNum]?.verses.length || 7);

  const surahData = QURAN_DATA[surahNum];
  const versesText = surahData?.verses || [];
  const activeVerses = versesText.slice(startVerse - 1, endVerse);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [verses, setVerses] = useState<VerseData[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize verses with demo data
  useEffect(() => {
    const initialVerses: VerseData[] = activeVerses.map((text, idx) => ({
      number: startVerse + idx,
      text,
      words: text.split(' ').map(word => ({
        text: word,
        status: 'default' as WordStatus,
      })),
    }));
    setVerses(initialVerses);
  }, [activeVerses, startVerse]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Simulate live feedback - move to next verse every 3 seconds
      const verseInterval = setInterval(() => {
        setCurrentVerseIndex(prev => {
          if (prev < activeVerses.length - 1) {
            return prev + 1;
          }
          clearInterval(verseInterval);
          return prev;
        });
      }, 3000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    setIsRecording(false);

    // Simulate evaluation with demo feedback
    simulateEvaluation();
  };

  const simulateEvaluation = () => {
    // Mock evaluation: Mark some words as incorrect/missing
    const updatedVerses = verses.map((verse, idx) => ({
      ...verse,
      words: verse.words.map((word, wordIdx) => {
        const rand = Math.random();
        if (rand < 0.05) return { ...word, status: 'missing' as WordStatus };
        if (rand < 0.15) return { ...word, status: 'incorrect' as WordStatus, expected: word.text };
        if (rand < 0.95) return { ...word, status: 'correct' as WordStatus };
        return word;
      }),
    }));
    setVerses(updatedVerses);

    const correctCount = updatedVerses.reduce(
      (sum, verse) => sum + verse.words.filter(w => w.status === 'correct').length,
      0
    );
    const totalCount = updatedVerses.reduce((sum, verse) => sum + verse.words.length, 0);
    const acc = Math.round((correctCount / totalCount) * 100);
    setAccuracy(acc);
    setShowFeedback(true);
  };

  const resetRecording = () => {
    setIsRecording(false);
    setDuration(0);
    setCurrentVerseIndex(0);
    setShowFeedback(false);
    setAccuracy(0);
    setVerses(verses.map(v => ({
      ...v,
      words: v.words.map(w => ({ text: w.text, status: 'default' as WordStatus })),
    })));
  };

  const getWordColor = (status: WordStatus) => {
    switch (status) {
      case 'correct':
        return 'text-green-600 bg-green-50';
      case 'incorrect':
        return 'text-red-600 bg-red-50';
      case 'missing':
        return 'text-red-600 line-through opacity-50';
      case 'active':
        return 'text-primary bg-primary/20 font-semibold';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/select-surah" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="text-center">
            <h1 className="font-semibold text-foreground">{surahData?.meaning}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Verses {startVerse} - {endVerse}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Accuracy</p>
            <p className="text-lg font-bold text-primary">{accuracy}%</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 overflow-y-auto">
        {/* Qur'anic Text Display */}
        {!showFeedback && (
          <div className="space-y-6 mb-12">
            {verses.map((verse, idx) => (
              <div
                key={verse.number}
                className={`p-6 rounded-lg border transition-all ${
                  idx === currentVerseIndex && isRecording
                    ? 'border-primary bg-primary/5'
                    : 'border-border/50 bg-card hover:border-primary/30'
                }`}
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                  Verse {verse.number}
                </p>
                <p className="text-3xl leading-relaxed text-right font-arabic text-foreground mb-4">
                  {verse.text}
                </p>
                {isRecording && (
                  <div className="flex flex-wrap gap-2 justify-end">
                    {verse.words.map((word, wordIdx) => (
                      <span
                        key={wordIdx}
                        className={`px-2 py-1 rounded text-sm transition-all ${getWordColor(word.status)}`}
                      >
                        {word.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Feedback View */}
        {showFeedback && (
          <div className="space-y-6">
            {/* Accuracy Score */}
            <div className="bg-card border border-border/50 rounded-lg p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <span className="text-3xl font-bold text-primary">{accuracy}%</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {accuracy >= 80 ? 'Excellent!' : accuracy >= 60 ? 'Good Job!' : 'Keep Practicing'}
              </h2>
              <p className="text-muted-foreground">
                {accuracy >= 80
                  ? 'Your recitation is very accurate!'
                  : 'Focus on the highlighted words to improve.'}
              </p>
            </div>

            {/* Verse Reviews */}
            <div className="space-y-4">
              {verses.map((verse) => {
                const hasErrors = verse.words.some(w => w.status !== 'correct' && w.status !== 'default');
                return (
                  <div key={verse.number} className="bg-card border border-border/50 rounded-lg p-6">
                    <div className="flex items-start gap-3 mb-3">
                      {hasErrors ? (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">Verse {verse.number}</h3>
                      </div>
                    </div>

                    <div className="bg-secondary/50 rounded p-4 mb-3">
                      <p className="text-2xl leading-relaxed text-right font-arabic text-foreground">
                        {verse.text}
                      </p>
                    </div>

                    {hasErrors && (
                      <div className="space-y-2 text-sm">
                        {verse.words.map((word, idx) => {
                          if (word.status === 'incorrect')
                            return (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                                <span className="text-red-600">✗</span>
                                <span className="text-foreground">
                                  You said: <span className="font-mono">{word.text}</span>
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-foreground">
                                  Expected: <span className="font-mono text-green-600">{word.expected}</span>
                                </span>
                              </div>
                            );
                          if (word.status === 'missing')
                            return (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                                <span className="text-red-600">✗</span>
                                <span className="text-foreground">
                                  Missing word: <span className="font-mono text-green-600">{word.text}</span>
                                </span>
                              </div>
                            );
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Floating Controls */}
      <div className="sticky bottom-0 left-0 right-0 border-t border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {!showFeedback && (
            <>
              {isRecording && (
                <div className="mb-4 flex items-center justify-center gap-2">
                  <div className="flex gap-1">
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
                  </div>
                  <span className="font-mono font-bold text-primary text-lg">
                    {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                {!isRecording ? (
                  <>
                    <Button
                      onClick={startRecording}
                      size="lg"
                      className="flex-1 gap-2 text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Mic className="w-5 h-5" />
                      Start Recording
                    </Button>
                    {duration > 0 && (
                      <Button
                        onClick={resetRecording}
                        variant="outline"
                        size="lg"
                        className="gap-2"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      onClick={stopRecording}
                      size="lg"
                      variant="destructive"
                      className="flex-1 gap-2 text-lg py-6"
                    >
                      <Square className="w-5 h-5" />
                      Stop Recording
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          {showFeedback && (
            <div className="flex gap-3">
              <Button
                onClick={resetRecording}
                variant="outline"
                size="lg"
                className="flex-1 gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Try Again
              </Button>
              <Link href="/select-surah" className="flex-1">
                <Button size="lg" className="w-full">
                  Choose Different Surah
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
