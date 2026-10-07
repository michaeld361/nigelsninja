import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono, Hanken_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-hanken",
});

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
  preload: true,
  variable: "--font-bricolage",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "nigelsninja",
  description: "LinkedIn privacy roles for Nigel Down, with a letter when he chooses to apply.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-[#0E0F11] text-[#F2F1EC]">
        <style>{`html[lang]{--font-bricolage:"Bricolage Grotesque";--font-hanken:"Hanken Grotesk";--font-geist:"Geist Mono"}`}</style>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
