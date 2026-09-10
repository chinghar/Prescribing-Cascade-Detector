import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prescribing Cascade Check",
  description:
    "Checks your medication list against published prescribing-cascade patterns and suggests one question to ask your doctor. Not a medical device.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-4 py-8">
          <header>
            <h1 className="text-2xl font-bold text-ink">Prescribing Cascade Check</h1>
            <p className="mt-2 text-lg text-ink-muted">
              A tool that suggests one question to ask your doctor about your medications. It does
              not diagnose, and it is not a substitute for medical advice.
            </p>
          </header>
          <main>{children}</main>
          <footer className="mt-auto border-t-2 border-border pt-4 text-base text-ink-muted">
            <p>
              This tool is not a medical device and does not provide medical advice. It only
              suggests questions to bring to a prescriber, based on published research.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
