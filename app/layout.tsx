import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import { QueryProviders } from "@/components/query-providers";
import { AppLoader } from "@/components/loader";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SwRegister } from "@/components/sw-register";
import { PageReadySignal } from "@/components/page-ready-signal";
import { PageTransition } from "@/components/page-transition";
import { SITE_URL } from "@/lib/site";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ROUNDS — Les records de la boxe",
    template: "%s · ROUNDS",
  },
  description:
    "ROUNDS : palmarès, profils et combats des plus grands boxeurs du monde. Recherche, filtres ultra-rapides et design néon.",
  keywords: ["boxe", "boxing", "palmarès", "records", "boxeurs", "combats"],
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "ROUNDS",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${anton.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink text-snow">
        <QueryProviders>
          <a href="#contenu" className="skip-link">
            Aller au contenu
          </a>
          {/* Rendu SSR : le rideau cache le site dès le premier paint et ne
              le révèle qu'à l'événement « page prête » (voir loader.tsx). */}
          <AppLoader />
          {/* Émet rounds:page-ready au window.load (source de l'événement). */}
          <PageReadySignal />
          <SwRegister />
          <Navbar />
          <main id="contenu" className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
        </QueryProviders>
      </body>
    </html>
  );
}
