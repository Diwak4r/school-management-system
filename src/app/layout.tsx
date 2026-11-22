import type { Metadata } from "next";
import { Manrope, Fraunces, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const deva = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  variable: "--font-deva",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ShikshaSetu | School Management Platform",
    template: "%s | ShikshaSetu",
  },
  description:
    "A modern school management platform for schools in Nepal. Manage students, teachers, attendance, examinations, fees and academic records.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${fraunces.variable} ${deva.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
