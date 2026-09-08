import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Airren",
    template: "%s · Airren",
  },
  description: "Guest-first travel. Only the best homes. 24/7 concierge. No fees or markups.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${instrument.variable} h-full antialiased`}>
      <body className={`${instrument.className} group/body min-h-full bg-white font-sans text-foreground`} data-fixed="true">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
