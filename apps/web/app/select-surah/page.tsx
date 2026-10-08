"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Search } from "lucide-react";
import { SURAHS } from "@repo/quran-data";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { matchesSurah } from "@/lib/surah-search";

type PracticeMode = "full" | "range";

interface SelectionState {
  surah: number | null;
  mode: PracticeMode;
  startVerse: number;
  endVerse: number;
}

export default function SelectSurahPage() {
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<SelectionState>({
    surah: null,
    mode: "full",
    startVerse: 1,
    endVerse: 1,
  });

  const selectedSurah = selection.surah ? SURAHS[selection.surah - 1] : undefined;
  const versesArray = selectedSurah
    ? Array.from({ length: selectedSurah.ayahCount }, (_, i) => i + 1)
    : [];

  const filteredSurahs = useMemo(() => SURAHS.filter((s) => matchesSurah(s, search)), [search]);

  const canProceed =
    !!selection.surah &&
    (selection.mode === "full" || selection.startVerse <= selection.endVerse);

  const href = selectedSurah
    ? `/recitation?surah=${selectedSurah.number}` +
      (selection.mode === "range" ? `&start=${selection.startVerse}&end=${selection.endVerse}` : "")
    : "#";

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/onboarding"
            className="inline-block mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Select Surah</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a Surah and how you want to practice
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                aria-label="Search surahs"
                placeholder="Search by name, meaning or number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[500px] pr-4">
              {filteredSurahs.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No surah matches “{search}”.
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredSurahs.map((surah) => {
                    const selected = selection.surah === surah.number;
                    return (
                      <li key={surah.number}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setSelection({
                              surah: surah.number,
                              mode: selection.mode,
                              startVerse: 1,
                              endVerse: surah.ayahCount,
                            })
                          }
                          className={`w-full text-left p-4 rounded-lg border transition-all ${
                            selected
                              ? "bg-primary/10 border-primary"
                              : "border-border/50 bg-card hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {surah.number}. {surah.transliteration}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {surah.translation} • {surah.ayahCount} verses
                              </p>
                            </div>
                            <span lang="ar" dir="rtl" className="font-arabic text-2xl text-foreground">
                              {surah.name}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>

          <div>
            <div className="sticky top-24 space-y-6">
              <div className="bg-secondary/50 border border-border/50 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  How to Use
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li>1. Select a Surah from the list</li>
                  <li>2. Choose to recite the full Surah or specific verses</li>
                  <li>3. Click &quot;Begin&quot; to start practicing</li>
                  <li>4. Record your recitation</li>
                  <li>5. Get instant feedback on accuracy</li>
                </ol>
              </div>

              {selectedSurah && (
                <div className="bg-card border border-primary/20 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-4">
                    {selectedSurah.transliteration}
                  </h3>

                  <FieldGroup>
                    <Field>
                      <FieldLabel>Practice Mode</FieldLabel>
                      <Select
                        value={selection.mode}
                        onValueChange={(mode) =>
                          setSelection({ ...selection, mode: mode as PracticeMode })
                        }
                      >
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full Surah</SelectItem>
                          <SelectItem value="range">Specific Verses</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    {selection.mode === "range" && (
                      <>
                        <Field>
                          <FieldLabel>Start Verse</FieldLabel>
                          <Select
                            value={String(selection.startVerse)}
                            onValueChange={(value) =>
                              setSelection({ ...selection, startVerse: Number(value) })
                            }
                          >
                            <SelectTrigger className="bg-input border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {versesArray.map((verse) => (
                                <SelectItem key={verse} value={String(verse)}>
                                  Verse {verse}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>

                        <Field>
                          <FieldLabel>End Verse</FieldLabel>
                          <Select
                            value={String(selection.endVerse)}
                            onValueChange={(value) =>
                              setSelection({ ...selection, endVerse: Number(value) })
                            }
                          >
                            <SelectTrigger className="bg-input border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {versesArray.map((verse) => (
                                <SelectItem key={verse} value={String(verse)}>
                                  Verse {verse}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        {!canProceed && (
                          <p className="text-sm text-destructive">
                            The start verse must come before the end verse.
                          </p>
                        )}
                      </>
                    )}
                  </FieldGroup>

                  {canProceed ? (
                    <Button asChild size="lg" className="w-full mt-6 gap-2">
                      <Link href={href}>
                        Begin Recitation
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button size="lg" className="w-full mt-6 gap-2" disabled>
                      Begin Recitation
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
