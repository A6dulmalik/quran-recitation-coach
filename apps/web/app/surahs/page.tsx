"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpenText, CheckCircle2, Mic, Search } from "lucide-react";
import { SURAHS, type SurahMeta } from "@repo/quran-data";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProgress } from "@/hooks/use-progress";
import { surahProgress, type ProgressState } from "@/lib/progress";
import { rangeQuery } from "@/lib/range";
import { matchesSurah } from "@/lib/surah-search";

function StatusLabel({ progress, surah }: { progress: ProgressState; surah: SurahMeta }) {
  const p = surahProgress(progress, surah.number);
  if (p.mastered === p.total && p.total > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="size-3.5" aria-hidden /> Mastered
      </span>
    );
  }
  if (p.practiced > 0) return <span className="text-xs font-medium text-amber-600">{p.percent}% perfect</span>;
  return null;
}

export default function SurahsPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SurahMeta | null>(null);
  const progress = useProgress();
  const results = useMemo(() => SURAHS.filter((s) => matchesSurah(s, query)), [query]);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">The Qur&apos;an</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose a surah to practice or read.</p>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          aria-label="Search surahs"
          placeholder="Search by name, meaning or number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {results.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No surah matches “{query}”.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
          {results.map((surah) => (
            <li key={surah.number}>
              <button
                type="button"
                onClick={() => setSelected(surah)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-none"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold tabular-nums text-primary">
                  {surah.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{surah.transliteration}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {surah.translation} · {surah.ayahCount} ayahs
                  </span>
                  <StatusLabel progress={progress} surah={surah} />
                </span>
                <span lang="ar" className="font-arabic text-xl">
                  {surah.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-xl rounded-t-2xl">
          {selected && <SurahSheet key={selected.number} surah={selected} progress={progress} />}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function SurahSheet({ surah, progress }: { surah: SurahMeta; progress: ProgressState }) {
  const [mode, setMode] = useState<"full" | "range">("full");
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(surah.ayahCount);
  const p = surahProgress(progress, surah.number);
  const ayahs = Array.from({ length: surah.ayahCount }, (_, i) => i + 1);
  const valid = start <= end;
  const query = rangeQuery(mode === "full" ? { surah: surah.number } : { surah: surah.number, start, end });

  return (
    <div className="space-y-5 p-4 pt-2">
      <SheetHeader className="p-0">
        {/* pr-8 keeps the name clear of the sheet's close button */}
        <div className="flex items-start justify-between gap-4 pr-8">
          <div>
            <SheetTitle className="text-xl">{surah.transliteration}</SheetTitle>
            <SheetDescription>
              {surah.translation} · {surah.ayahCount} ayahs · {surah.revelation === "meccan" ? "Meccan" : "Medinan"}
            </SheetDescription>
          </div>
          <span lang="ar" className="font-arabic text-3xl">
            {surah.name}
          </span>
        </div>
      </SheetHeader>

      {p.practiced > 0 && (
        <div>
          <Progress value={p.percent} className="h-2" aria-label={`${p.percent}% perfect`} />
          <p className="mt-1 text-xs text-muted-foreground">
            {p.mastered} of {p.total} ayahs perfect
          </p>
        </div>
      )}

      {surah.ayahCount > 1 && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as "full" | "range")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="full">Whole surah</TabsTrigger>
            <TabsTrigger value="range">Choose ayahs</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {mode === "range" && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "from", label: "From ayah", value: start, set: setStart },
            { id: "to", label: "To ayah", value: end, set: setEnd },
          ].map(({ id, label, value, set }) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={`ayah-${id}`}>{label}</Label>
              <Select value={String(value)} onValueChange={(v) => set(Number(v))}>
                <SelectTrigger id={`ayah-${id}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {ayahs.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {!valid && (
            <p className="col-span-2 text-sm text-destructive">The first ayah must come before the last.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {valid ? (
          <>
            <Button asChild size="lg" className="gap-2">
              <Link href={`/practice?${query}`}>
                <Mic className="size-4" /> Practice
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2">
              <Link href={`/read?${query}`}>
                <BookOpenText className="size-4" /> Read
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" disabled className="gap-2">
              <Mic className="size-4" /> Practice
            </Button>
            <Button size="lg" variant="outline" disabled className="gap-2">
              <BookOpenText className="size-4" /> Read
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
