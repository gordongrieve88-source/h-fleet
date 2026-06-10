import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "H-Fleet",
  description: "Daily truck and driver rostering for the metro agitator fleet — done properly.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Heidelberg Materials brand fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Lexend+Exa:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-full bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
