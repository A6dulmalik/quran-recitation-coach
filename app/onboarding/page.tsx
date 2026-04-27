'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Headphones, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Qur'an Coaching</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Headphones className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Perfect Your Qur'an Recitation
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Get real-time feedback and guidance to improve your Tajweed and recitation accuracy
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-12">
            {[
              {
                step: 1,
                title: 'Select a Surah',
                description: 'Choose from all 114 Surahs of the Qur\'an',
                icon: BookOpen,
              },
              {
                step: 2,
                title: 'Choose Your Practice',
                description: 'Recite the full Surah or specific verses',
                icon: Zap,
              },
              {
                step: 3,
                title: 'Start Reciting',
                description: 'Record your recitation with real-time guidance',
                icon: Headphones,
              },
              {
                step: 4,
                title: 'Get Instant Feedback',
                description: 'See detailed analysis and improvements to make',
                icon: Sparkles,
              },
            ].map(({ step, title, description, icon: Icon }) => (
              <div
                key={step}
                className="flex gap-4 p-4 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">{step}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              {
                title: 'Word-by-Word Analysis',
                description: 'See exactly which words need improvement',
              },
              {
                title: 'Real-Time Feedback',
                description: 'Get instant guidance as you recite',
              },
              {
                title: 'Accuracy Score',
                description: 'Track your progress with detailed metrics',
              },
            ].map((feature, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Link href="/select-surah" className="block">
            <Button size="lg" className="w-full gap-2 text-lg py-6">
              Start Recitation
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>

          {/* Info Text */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            No account needed. Your practice sessions are stored locally on this device.
          </p>
        </div>
      </main>
    </div>
  );
}
