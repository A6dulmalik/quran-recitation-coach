import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
      {children}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <Centered>
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <p className="text-muted-foreground" role="status">
        {label}
      </p>
    </Centered>
  );
}

export function ErrorState({ title, detail, onRetry }: { title: string; detail?: string; onRetry?: () => void }) {
  return (
    <Centered>
      <AlertCircle className="size-8 text-destructive" aria-hidden />
      <p className="text-lg font-semibold">{title}</p>
      {detail && <p className="text-sm text-muted-foreground max-w-sm">{detail}</p>}
      <div className="flex gap-3">
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        <Button asChild variant={onRetry ? "outline" : "default"}>
          <Link href="/surahs">Choose a surah</Link>
        </Button>
      </div>
    </Centered>
  );
}

export function InvalidRangeState() {
  return <ErrorState title="That surah or ayah range does not exist." />;
}
