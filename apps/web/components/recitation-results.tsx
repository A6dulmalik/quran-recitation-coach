'use client';

import { Button } from '@/components/ui/button';
import { Play, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

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

interface RecitationResultsProps {
  accuracy: number;
  transcribedText: string;
  expectedText: string;
  wordResults: WordResult[];
  errors: Error[];
  audioUrl?: string;
  onTryAgain: () => void;
  isLoading?: boolean;
}

export function RecitationResults({
  accuracy,
  transcribedText,
  expectedText,
  wordResults,
  errors,
  audioUrl,
  onTryAgain,
  isLoading,
}: RecitationResultsProps) {
  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return 'text-green-600';
    if (acc >= 70) return 'text-blue-600';
    if (acc >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyBg = (acc: number) => {
    if (acc >= 90) return 'bg-green-100 border-green-300';
    if (acc >= 70) return 'bg-blue-100 border-blue-300';
    if (acc >= 50) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  return (
    <div className="space-y-6">
      {/* Accuracy Score */}
      <div className={`rounded-lg border p-6 ${getAccuracyBg(accuracy)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-1">
              Accuracy Score
            </p>
            <p className={`text-5xl font-bold ${getAccuracyColor(accuracy)}`}>
              {accuracy}%
            </p>
          </div>
          <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center" style={{ borderColor: 'currentColor' }}>
            <span className={`text-2xl font-bold ${getAccuracyColor(accuracy)}`}>{accuracy}%</span>
          </div>
        </div>
        <div className="mt-4 w-full bg-white rounded-full h-3 overflow-hidden border border-border">
          <div
            className={`h-full transition-all duration-500 ${
              accuracy >= 90
                ? 'bg-green-600'
                : accuracy >= 70
                ? 'bg-blue-600'
                : accuracy >= 50
                ? 'bg-yellow-600'
                : 'bg-red-600'
            }`}
            style={{ width: `${accuracy}%` }}
          />
        </div>
      </div>

      {/* Your Recitation vs Expected */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Your Recitation
          </h3>
          <p className="text-lg leading-relaxed text-foreground break-words">
            {wordResults.length > 0
              ? wordResults.map((result, i) => (
                  <span
                    key={i}
                    className={`inline-block mr-1 ${
                      result.status === 'correct'
                        ? 'text-green-600 font-medium'
                        : result.status === 'incorrect'
                        ? 'text-yellow-600 line-through'
                        : 'opacity-40'
                    }`}
                  >
                    {result.word}
                  </span>
                ))
              : transcribedText}
          </p>
        </div>

        <div className="bg-secondary/20 rounded-lg border border-secondary/30 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Expected Text
          </h3>
          <p className="text-lg leading-relaxed text-foreground text-right break-words">
            {expectedText}
          </p>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-card rounded-lg border border-destructive/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold text-foreground">
              Errors Found ({errors.length})
            </h3>
          </div>
          <div className="space-y-3">
            {errors.map((error, i) => (
              <div key={i} className="flex gap-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                <div className="flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{error.message}</p>
                  {error.expected && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Expected: <span className="font-mono">{error.expected}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {accuracy >= 90 && (
        <div className="bg-green-50 rounded-lg border border-green-300 p-6 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-900 mb-1">Excellent Recitation!</p>
            <p className="text-sm text-green-800">Your recitation is very accurate. Keep practicing to maintain this level.</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {audioUrl && (
          <Button
            onClick={playAudio}
            variant="outline"
            className="gap-2 flex-1"
          >
            <Play className="w-4 h-4" />
            Play Recording
          </Button>
        )}
        <Button
          onClick={onTryAgain}
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 flex-1"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
