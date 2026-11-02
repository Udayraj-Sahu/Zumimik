import type { Metadata, Viewport } from "next";
import { LIME_BRIGHT } from "@/lib/theme";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { OnlineProvider } from "@/providers/online-provider";
import { CapacitorInit } from "./capacitor-init";
import { AppEntry } from "@/components/shell/app-entry";

const spaceGrotesk = { variable: "--font-space-grotesk" };
const inter = { variable: "--font-inter" };
const jetbrainsMono = { variable: "--font-jetbrains-mono" };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Zuzumik — Competitive Learning Platform",
  description:
    "A competitive battlefield where India's sharpest minds fight, rank, and rise through dynamic exam preparation.",
  keywords: ["exam preparation", "competitive exams", "IIT JEE", "NEET", "UPSC", "online learning", "zuzumik", "mock tests"],
  robots: "index, follow",
  metadataBase: new URL("https://zuzumik.com"),
  alternates: {
    canonical: "https://zuzumik.com",
  },
  openGraph: {
    title: "Zuzumik — Become the Legend.",
    description:
      "Not a coaching platform. A competitive battlefield where India's sharpest minds fight, rank, and rise.",
    type: "website",
    url: "https://zuzumik.com",
    siteName: "Zuzumik",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zuzumik — Competitive Learning Platform",
    description:
      "Not a coaching platform. A competitive battlefield where India's sharpest minds fight, rank, and rise.",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  other: {
    "theme-color": LIME_BRIGHT,
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html
        lang="en"
        className={`loading overflow-x-clip ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
        suppressHydrationWarning
      >
      <body className="overflow-x-clip">
        <style>{`html.loading #main-content{opacity:0}`}</style>
        <div className="bg-background min-h-[100dvh] pb-0 overflow-x-clip" id="main-content">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded focus:text-sm focus:font-semibold"
          >
            Skip to content
          </a>
          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                name: "Zuzumik",
                description:
                  "A competitive exam preparation platform with dynamic progress maps, rankings, and AI coaching.",
                applicationCategory: "EducationalApplication",
                operatingSystem: "All",
              }),
            }}
          />
          <QueryProvider>
            <OnlineProvider>
              <CapacitorInit />
              <AppEntry>{children}</AppEntry>
            </OnlineProvider>
          </QueryProvider>
        </div>
      </body>
    </html>
  );
}
