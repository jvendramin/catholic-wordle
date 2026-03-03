import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1d232a",
};

export const metadata: Metadata = {
  title: "Catholic Wordle",
  description: "A daily word puzzle game inspired by the Catholic faith. Guess Christian-themed words from 5 to 10 letters.",
  keywords: ["catholic", "wordle", "word game", "christian", "bible", "faith", "puzzle"],
  authors: [{ name: "jvendramin" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CathWordle",
  },
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
