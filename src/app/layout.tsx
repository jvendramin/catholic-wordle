import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Catholic Wordle",
  description: "A daily word puzzle game inspired by the Catholic faith. Guess Christian-themed words from 5 to 10 letters.",
  keywords: ["catholic", "wordle", "word game", "christian", "bible", "faith", "puzzle"],
  authors: [{ name: "jvendramin" }],
  openGraph: {
    title: "Catholic Wordle",
    description: "A daily word puzzle game inspired by the Catholic faith.",
    type: "website",
    images: [{ url: "/og-image.png", width: 768, height: 768 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Catholic Wordle",
    description: "A daily word puzzle game inspired by the Catholic faith.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
