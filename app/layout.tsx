import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TideRent | Bond settlement with shared authority",
  description: "A prototype for safer, evidence-backed rental bond settlements in Victoria.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
