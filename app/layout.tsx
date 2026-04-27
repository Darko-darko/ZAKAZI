import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zakazi.pro"),
  applicationName: "zakazi.pro",
  title: {
    default: "zakazi.pro - online zakazivanje termina",
    template: "%s | zakazi.pro",
  },
  description:
    "Mini sajt sa booking funkcijom za salone, studije i ordinacije. Klijenti zakazuju termin bez poziva, 24 sata dnevno.",
  keywords: [
    "online zakazivanje",
    "zakazivanje termina",
    "booking sistem",
    "mini sajt",
    "saloni",
    "studiji",
    "ordinacije",
  ],
  authors: [{ name: "zakazi.pro" }],
  creator: "zakazi.pro",
  publisher: "zakazi.pro",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "sr_RS",
    url: "/",
    siteName: "zakazi.pro",
    title: "zakazi.pro - online zakazivanje termina",
    description:
      "Profesionalan mini sajt i booking tok za usluzne biznise. Klijenti biraju uslugu, radnika i slobodan termin bez poziva.",
  },
  twitter: {
    card: "summary_large_image",
    title: "zakazi.pro - online zakazivanje termina",
    description:
      "Mini sajt i online booking za salone, studije i ordinacije.",
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
      lang="sr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
