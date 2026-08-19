import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Database, ShieldCheck, Zap } from "lucide-react";
import { searchBoxeurs, getCombatsAvenir, getCombatsRecents } from "@/lib/data";
import { JsonLd } from "@/components/json-ld";
import { Hero } from "@/components/home/hero";
import { SITE_URL } from "@/lib/site";
import { Reveal } from "@/components/reveal";
import { Counter } from "@/components/counter";
import { FighterCard } from "@/components/fighter-card";
import { FightCard } from "@/components/fight-card";
import { NewsSection } from "@/components/home/news";

export default async function Home() {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const [{ fighters }, { fights: upcoming }, { fights: recents }] =
    await Promise.all([
      searchBoxeurs({ limit: 300 }),
      getCombatsAvenir(6),
      getCombatsRecents(30),
    ]);

  const top = [...fighters].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).slice(0, 5);
  const countries = new Set(fighters.map((f) => f.country)).size;
  const titles = fighters.reduce((n, f) => n + f.titles.length, 0);

  const stats = [
    { label: t("statsBoxeurs"), value: fighters.length, suffix: "" },
    { label: t("statsCombats"), value: upcoming.length + recents.length, suffix: "" },
    { label: t("statsPays"), value: countries, suffix: "" },
    { label: t("statsCeintures"), value: titles, suffix: "" },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ROUNDS",
          url: SITE_URL,
          inLanguage: locale === "en" ? "en-US" : "fr-FR",
          description: t("ldDescription"),
        }}
      />
      <Hero />

      {/* ── Stats ────────────────────────────────────────── */}
      <section className="relative border-y border-line/60 bg-panel/50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="font-display text-4xl text-snow sm:text-5xl">
                  <Counter to={s.value} suffix={s.suffix} className="text-snow" />
                </p>
                <p className="text-xs uppercase tracking-wider text-fog">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Top 5 pound-for-pound ────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold">
                {t("p4p")}
              </p>
              <h2 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow sm:text-5xl">
                {t("bestWorld")}
              </h2>
            </div>
            <Link
              href="/boxeurs"
              className="text-sm font-medium text-mist underline-offset-4 transition-colors hover:text-neon hover:underline"
            >
              {t("viewAllBoxeurs")} →
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((fighter, i) => (
            <Reveal key={fighter.slug} delay={i * 0.07}>
              <FighterCard fighter={fighter} index={i} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Combats à venir ──────────────────────────────── */}
      <section className="relative border-y border-line/60 bg-panel/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal>
            <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
                  {t("comingSoon")}
                </p>
                <h2 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow sm:text-5xl">
                  {t("bigFights")}
                </h2>
              </div>
              <Link
                href="/combats"
                className="text-sm font-medium text-mist underline-offset-4 transition-colors hover:text-neon hover:underline"
              >
                {t("allFights")} →
              </Link>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((fight, i) => (
              <Reveal key={fight.id} delay={i * 0.07}>
                <FightCard fight={fight} index={i} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Actualités (articles + vidéos) ──────────────── */}
      <NewsSection />

      {/* ── Multi-sources ────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <div className="rounded-3xl border border-line/60 bg-panel p-8 panel-glow sm:p-10">
            <div className="mb-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-3xl uppercase tracking-wide text-snow">
                {t("multisource")}
              </h2>
              <p className="max-w-md text-sm text-mist">{t("multisourceText")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: <Database size={18} aria-hidden />,
                  title: t("sourceBigballsTitle"),
                  desc: t("sourceBigballsDesc"),
                },
                {
                  icon: <ShieldCheck size={18} aria-hidden />,
                  title: t("sourceThesportsdbTitle"),
                  desc: t("sourceThesportsdbDesc"),
                },
                {
                  icon: <Zap size={18} aria-hidden />,
                  title: t("sourceOddsTitle"),
                  desc: t("sourceOddsDesc"),
                },
              ].map((p, i) => (
                <Reveal key={p.title} delay={i * 0.08}>
                  <div className="h-full rounded-2xl border border-line/60 bg-ink/50 p-5 transition-colors hover:border-neon/40">
                    <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neon/10 text-neon">
                      {p.icon}
                    </span>
                    <p className="font-display text-sm uppercase tracking-wide text-snow">
                      {p.title}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-mist">{p.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}