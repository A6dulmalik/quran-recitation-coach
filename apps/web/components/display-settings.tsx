"use client";

import { Monitor, Moon, SlidersHorizontal, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useHydrated } from "@/hooks/use-hydrated";
import { useReadingPrefs } from "@/hooks/use-reading-prefs";
import { readingPrefsStore } from "@/lib/reading-prefs";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
] as const;

/** Theme and reading-aid preferences. */
export function DisplaySettings() {
  const { theme = "system", setTheme } = useTheme();
  const hydrated = useHydrated();
  const prefs = useReadingPrefs();
  const selected = hydrated ? theme : "system";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Display settings">
          <SlidersHorizontal className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Display</DialogTitle>
          <DialogDescription>Saved on this device.</DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected === value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-sm font-medium transition-colors",
                selected === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="pref-transliteration">Read in English (transliteration)</Label>
            <Switch
              id="pref-transliteration"
              checked={prefs.transliteration}
              onCheckedChange={(transliteration) => readingPrefsStore.update({ transliteration })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="pref-translation">English translation</Label>
            <Switch
              id="pref-translation"
              checked={prefs.translation}
              onCheckedChange={(translation) => readingPrefsStore.update({ translation })}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
