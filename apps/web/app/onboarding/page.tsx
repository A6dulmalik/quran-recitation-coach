"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Headphones, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { progressStore } from "@/lib/progress";

const STEPS = [
  { icon: BookOpen, title: "Choose a surah", text: "All 114 surahs, the whole surah or just the ayahs you're memorising." },
  { icon: Headphones, title: "Listen first", text: "Hear each ayah from a renowned reciter before you try it." },
  { icon: Mic, title: "Recite one ayah at a time", text: "Tap the microphone, recite, and tap again when you finish." },
  {
    icon: Sparkles,
    title: "See every mistake",
    text: "Words you changed, skipped or added are highlighted, and stopping where you should join (waṣl) is flagged.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();

  const getStarted = () => {
    progressStore.update((s) => ({ ...s, onboarded: true }));
    router.push("/surahs");
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-primary/10 via-background to-background">
      <main className="mx-auto flex max-w-xl flex-col px-4 py-12">
        <div className="text-center">
          <span
            className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary font-arabic text-3xl text-primary-foreground"
            aria-hidden
          >
            ق
          </span>
          <h1 className="mt-6 text-3xl font-bold sm:text-4xl">Perfect your Qur&apos;an recitation</h1>
          <p className="mt-3 text-muted-foreground">
            Recite aloud and get word-by-word feedback on every ayah, until you can recite it perfectly.
          </p>
        </div>

        <ol className="mt-10 space-y-3">
          {STEPS.map(({ icon: Icon, title, text }, k) => (
            <li key={title} className="flex gap-4 rounded-xl border border-border/60 bg-card p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
                <span className="sr-only">Step {k + 1}</span>
              </span>
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        <Button size="lg" className="mt-8 gap-2 py-6 text-base" onClick={getStarted}>
          Get started <ArrowRight className="size-5" />
        </Button>

        <p className="mt-6 flex gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          <span>
            No account needed; your progress stays on this device. To check a recitation, the recording is sent
            securely to our server and a speech-recognition service. This app does not store your recordings.
          </span>
        </p>
      </main>
    </div>
  );
}
