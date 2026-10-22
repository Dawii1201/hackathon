import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const logo = Fraunces({ subsets: ["latin"], variable: "--font-logo", weight: ["700"], display: "swap" });

export const metadata: Metadata = {
  title: "Settle | Bond settlement with shared authority",
  description: "A prototype for safer, evidence-backed rental bond settlements in Victoria.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. Grammarly, QuillBot) add
    // attributes to <html>/<body> before React hydrates. This only ignores
    // attribute differences on these two elements, not inside the app.
    <html lang="en-AU" className={`${sans.variable} ${logo.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
