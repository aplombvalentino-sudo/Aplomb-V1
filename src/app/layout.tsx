import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = process.env.NEXTAUTH_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aplomb — AI Fitting Room for Fashion Brands",
    template: "%s | Aplomb",
  },
  description:
    "Give your shoppers accurate size recommendations and complete outfit suggestions powered by AI body measurement. Reduce returns by 38% on average.",
  keywords: ["AI fitting room", "size recommendation", "fashion tech", "outfit suggestion", "reduce returns"],
  authors: [{ name: "Aplomb" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Aplomb",
    title: "Aplomb — AI Fitting Room for Fashion Brands",
    description:
      "Give your shoppers accurate size recommendations and complete outfit suggestions. Reduce returns, increase conversion.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Aplomb — AI Fitting Room",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aplomb — AI Fitting Room for Fashion Brands",
    description: "Give your shoppers accurate size recommendations and complete outfit suggestions.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="grain-overlay min-h-full flex flex-col overflow-x-hidden" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
