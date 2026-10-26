import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Amiri_Quran, Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ServiceWorker } from "@/components/service-worker";
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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  appleWebApp: { capable: true, title: "Recitation", statusBarStyle: "default" },
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
        <ServiceWorker />
        {analyticsEnabled && <Analytics />}
      </body>
    </html>
  );
}
