import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: {
    default: "Bundle Audit",
    template: "%s · Bundle Audit",
  },
  description:
    "Check a proposed Fanvue PPV photo bundle against purchases you have already recorded, including confirmed reuploads.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`} style={{ fontFamily: "var(--font-sans), Outfit, sans-serif", ["--serif" as string]: "var(--font-serif), Fraunces, serif", ["--sans" as string]: "var(--font-sans), Outfit, sans-serif" }}>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <div id="content">{children}</div>
      </body>
    </html>
  );
}
