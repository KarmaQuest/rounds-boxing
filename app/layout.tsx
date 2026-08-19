import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("title.default"),
      template: t("title.template"),
    },
    description: t("description"),
    keywords: t("keywords").split(",").map((k) => k.trim()),
    alternates: { canonical: "/" },
    openGraph: {
      siteName: "ROUNDS",
      locale: t("ogLocale"),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations("nav");

  return (
    <html lang={locale} className={`${anton.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ink text-snow">
        <NextIntlClientProvider>
          <QueryProviders>
            <a href="#contenu" className="skip-link">
              {t("skip")}
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}