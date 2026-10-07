'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, Search, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// Sample Surahs data
const SURAHS = [
  { number: 1, name: 'Al-Fatiha', verses: 7, meaning: 'The Opening' },
  { number: 2, name: 'Al-Baqarah', verses: 286, meaning: 'The Cow' },
  { number: 3, name: 'Ali Imran', verses: 200, meaning: 'The Family of Imran' },
  { number: 4, name: 'An-Nisa', verses: 176, meaning: 'The Women' },
  { number: 5, name: 'Al-Ma\'idah', verses: 120, meaning: 'The Table Spread' },
  { number: 6, name: 'Al-An\'am', verses: 165, meaning: 'The Livestock' },
  { number: 7, name: 'Al-A\'raf', verses: 206, meaning: 'The Heights' },
  { number: 8, name: 'Al-Anfal', verses: 75, meaning: 'The Spoils of War' },
  { number: 9, name: 'At-Taubah', verses: 129, meaning: 'The Repentance' },
  { number: 10, name: 'Yunus', verses: 109, meaning: 'Jonah' },
  { number: 36, name: 'Ya-Sin', verses: 83, meaning: 'Ya-Sin' },
  { number: 55, name: 'Ar-Rahman', verses: 78, meaning: 'The Merciful' },
  { number: 67, name: 'Al-Mulk', verses: 30, meaning: 'The Dominion' },
  { number: 112, name: 'Al-Ikhlas', verses: 4, meaning: 'The Purity' },
];

type RecitationMode = 'full' | 'range';

interface SelectionState {
  surah: number | null;
  mode: RecitationMode;
  startVerse: number | null;
  endVerse: number | null;
}

export default function SelectSurahPage() {
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<SelectionState>({
    surah: null,
    mode: 'full',
    startVerse: null,
    endVerse: null,
  });

  const selectedSurah = SURAHS.find(s => s.number === selection.surah);
  const versesArray = selectedSurah ? Array.from({ length: selectedSurah.verses }, (_, i) => i + 1) : [];

  const filteredSurahs = useMemo(() => {
    return SURAHS.filter(
      surah =>
        surah.name.toLowerCase().includes(search.toLowerCase()) ||
        surah.meaning.toLowerCase().includes(search.toLowerCase()) ||
        surah.number.toString().includes(search)
    );
  }, [search]);

  const canProceed = () => {
    if (!selection.surah) return false;
    if (selection.mode === 'range') {
      return selection.startVerse && selection.endVerse && selection.startVerse <= selection.endVerse;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/onboarding" className="inline-block mb-4">
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Select Surah</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a Surah and how you want to practice
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Surah Selection */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name or number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {filteredSurahs.map((surah) => (
                  <button
                    key={surah.number}
                    onClick={() =>
                      setSelection({
                        ...selection,
                        surah: surah.number,
                        startVerse: 1,
                        endVerse: surah.verses,
                      })
                    }
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selection.surah === surah.number
                        ? 'bg-primary/10 border-primary'
                        : 'border-border/50 bg-card hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{surah.number}. {surah.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {surah.meaning} • {surah.verses} verses
                        </p>
                      </div>
                      {selection.surah === surah.number && (
                        <ChevronRight className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Practice Options */}
          <div>
            <div className="sticky top-24 space-y-6">
              {/* Guide Section */}
              <div className="bg-secondary/50 border border-border/50 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  How to Use
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li>1. Select a Surah from the list</li>
                  <li>2. Choose to recite the full Surah or specific verses</li>
                  <li>3. Click "Begin" to start practicing</li>
                  <li>4. Record your recitation</li>
                  <li>5. Get instant feedback on accuracy</li>
                </ol>
              </div>

              {/* Selected Surah Details */}
              {selectedSurah && (
                <div className="bg-card border border-primary/20 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-4">{selectedSurah.name}</h3>

                  <FieldGroup>
                    <Field>
                      <FieldLabel>Practice Mode</FieldLabel>
                      <Select value={selection.mode} onValueChange={(mode) => 
                        setSelection({ ...selection, mode: mode as RecitationMode })
                      }>
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Surah</SelectItem>
                          <SelectItem value="range">Specific Verses</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    {selection.mode === 'range' && (
                      <>
                        <Field>
                          <FieldLabel>Start Verse</FieldLabel>
                          <Select
                            value={selection.startVerse?.toString() || ''}
                            onValueChange={(value) =>
                              setSelection({ ...selection, startVerse: parseInt(value) })
                            }
                          >
                            <SelectTrigger className="bg-input border-border">
                              <SelectValue />
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

                        <Field>
                          <FieldLabel>End Verse</FieldLabel>
                          <Select
                            value={selection.endVerse?.toString() || ''}
                            onValueChange={(value) =>
                              setSelection({ ...selection, endVerse: parseInt(value) })
                            }
                          >
                            <SelectTrigger className="bg-input border-border">
                              <SelectValue />
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
                      </>
                    )}
                  </FieldGroup>

                  <Link
                    href={`/recitation?surah=${selection.surah}&mode=${selection.mode}${
                      selection.mode === 'range'
                        ? `&start=${selection.startVerse}&end=${selection.endVerse}`
                        : ''
                    }`}
                    className="block"
                  >
                    <Button
                      disabled={!canProceed()}
                      className="w-full mt-6 gap-2"
                      size="lg"
                    >
                      Begin Recitation
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
