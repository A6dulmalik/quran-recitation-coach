'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';

// 🔌 API INTEGRATION: This list will be fetched from backend API
// Currently using sample data for demonstration
const SURAHS = [
  { number: 1, name: 'Al-Fatiha', verses: 7 },
  { number: 2, name: 'Al-Baqarah', verses: 286 },
  { number: 3, name: 'Ali Imran', verses: 200 },
  { number: 4, name: 'An-Nisa', verses: 176 },
  { number: 5, name: 'Al-Ma\'idah', verses: 120 },
  { number: 6, name: 'Al-An\'am', verses: 165 },
  { number: 7, name: 'Al-A\'raf', verses: 206 },
  { number: 8, name: 'Al-Anfal', verses: 75 },
  { number: 9, name: 'At-Taubah', verses: 129 },
  { number: 10, name: 'Yunus', verses: 109 },
  { number: 36, name: 'Ya-Sin', verses: 83 },
  { number: 55, name: 'Ar-Rahman', verses: 78 },
  { number: 67, name: 'Al-Mulk', verses: 30 },
  { number: 112, name: 'Al-Ikhlas', verses: 4 },
];

type RecitationMode = 'single' | 'complete' | 'fromBeginning';

interface SurahSelectorProps {
  selectedSurah: number | null;
  selectedAyah: number | null;
  selectedMode: RecitationMode;
  onSurahChange: (surah: number) => void;
  onAyahChange: (ayah: number) => void;
  onModeChange: (mode: RecitationMode) => void;
  verseText?: string;
}

export function SurahSelector({
  selectedSurah,
  selectedAyah,
  selectedMode,
  onSurahChange,
  onAyahChange,
  onModeChange,
  verseText,
}: SurahSelectorProps) {
  const selectedSurahData = SURAHS.find((s) => s.number === selectedSurah);
  const versesCount = selectedSurahData?.verses || 0;
  const versesArray = Array.from({ length: versesCount }, (_, i) => i + 1);

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">Select Surah & Recitation Mode</h2>
      
      <FieldGroup>
        <Field>
          <FieldLabel>Surah</FieldLabel>
          <Select value={selectedSurah?.toString() || ''} onValueChange={(value) => onSurahChange(parseInt(value))}>
            <SelectTrigger className="bg-input border-border">
              <SelectValue placeholder="Select a Surah" />
            </SelectTrigger>
            <SelectContent>
              {SURAHS.map((surah) => (
                <SelectItem key={surah.number} value={surah.number.toString()}>
                  {surah.number}. {surah.name} ({surah.verses} verses)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {selectedSurah && (
          <>
            <Field>
              <FieldLabel>Recitation Mode</FieldLabel>
              <Select value={selectedMode} onValueChange={(value) => onModeChange(value as RecitationMode)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select recitation mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Verse</SelectItem>
                  <SelectItem value="complete">Complete Surah</SelectItem>
                  <SelectItem value="fromBeginning">From Beginning to Verse</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {(selectedMode === 'single' || selectedMode === 'fromBeginning') && (
              <Field>
                <FieldLabel>
                  {selectedMode === 'single' ? 'Select Ayah (Verse)' : 'Recite From Beginning to Ayah'}
                </FieldLabel>
                <Select value={selectedAyah?.toString() || ''} onValueChange={(value) => onAyahChange(parseInt(value))}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select an Ayah" />
                  </SelectTrigger>
                  <SelectContent>
                    {versesArray.map((verse) => (
                      <SelectItem key={verse} value={verse.toString()}>
                        Verse {verse}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </>
        )}
      </FieldGroup>

      {/* How to Use - Only shown on this selection page */}
      {selectedSurah && (
        <div className="mt-6 bg-secondary/20 rounded-lg border border-secondary/30 p-4">
          <h3 className="font-semibold text-foreground mb-3">How to Use</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. You have selected <strong>{selectedSurahData?.name}</strong></li>
            <li>2. Choose your recitation mode: single verse, complete Surah, or verses from the beginning</li>
            <li>3. The Qur&apos;anic text will be displayed for reference</li>
            <li>4. Click &quot;Begin Recitation&quot; to start recording your recitation</li>
            <li>5. Recite clearly and accurately - incorrect words will be highlighted in red</li>
            <li>6. Receive instant feedback with your accuracy score and detailed error analysis</li>
          </ol>
        </div>
      )}

      {/* Text Preview */}
      {verseText && selectedSurah && selectedAyah && (
        <div className="mt-6 p-4 bg-secondary/20 rounded-lg border border-secondary/30">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Preview
          </p>
          <p className="text-lg leading-relaxed text-foreground text-right font-arabic">
            {verseText}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {selectedSurahData?.name} - Verse {selectedAyah}
          </p>
        </div>
      )}
    </div>
  );
}
