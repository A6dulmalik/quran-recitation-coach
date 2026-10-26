"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, BookOpen, Home } from "lucide-react";
import { TANZIL_ATTRIBUTION } from "@repo/quran-data";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/surahs", label: "Qur'an", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: BarChart3 },
] as const;

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** Layout for the main tabs: top bar on desktop, bottom tab bar on phones. */
export function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span
              className="flex size-8 items-center justify-center rounded-full bg-primary font-arabic text-lg text-primary-foreground"
              aria-hidden
            >
              ق
            </span>
            <span>{title ?? "Qur'an Recitation Coach"}</span>
          </Link>
          <nav aria-label="Main" className="hidden gap-1 sm:flex">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(pathname, href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-6 sm:pb-12">{children}</main>

      <footer className="hidden pb-6 text-center text-xs text-muted-foreground sm:block">
        Qur&apos;an text:{" "}
        <a href={TANZIL_ATTRIBUTION.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          {TANZIL_ATTRIBUTION.name}
        </a>{" "}
        ({TANZIL_ATTRIBUTION.license})
      </footer>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border/50 bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="grid grid-cols-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
