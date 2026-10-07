import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Amiri_Quran, Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
// Designed for Qur'anic text (Uthmani marks, waqf signs); SIL Open Font License.
const amiriQuran = Amiri_Quran({
  weight: "400",
  subsets: ["arabic"],
  variable: "--font-amiri-quran",
});

export const metadata: Metadata = {
  title: {
    default: "Qur'an Recitation Coach",
    template: "%s · Qur'an Recitation Coach",
  },
  description: "Recite the Qur'an aloud and get word-by-word feedback on every ayah.",
  applicationName: "Qur'an Recitation Coach",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#00785a",
};

// Vercel Web Analytics only works on Vercel; opt in explicitly.
const analyticsEnabled = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "1";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${geist.variable} ${amiriQuran.variable} font-sans antialiased`}>
        {children}
        {analyticsEnabled && <Analytics />}
      </body>
    </html>
  );
}
