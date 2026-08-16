import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Crown, Ruler, Scale, Calendar, Flag, Swords } from "lucide-react";
import {
  getBoxeur,
  getBoxerBelts,
  getCombatsAvenir,
  getCombatsRecents,
} from "@/lib/data";
import type { Fight } from "@/lib/data/types";
import { koPct } from "@/lib/data/utils";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import { RecordBar, RecordNumbers } from "@/components/record-bar";
import { FightCard } from "@/components/fight-card";
import { FavoriteButton } from "@/components/auth/favorite-button";
import { SITE_URL } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { fighter } = await getBoxeur(slug);
  if (!fighter) return { title: "Boxeur introuvable" };
  return {
    title: `${fighter.name} — palmarès ${fighter.record.wins}-${fighter.record.losses}-${fighter.record.draws}`,
    description: `${fighter.name} (${fighter.country}) : ${fighter.weightClass}, ${fighter.record.wins} victoires dont ${fighter.record.ko} par KO.`,
    alternates: { canonical: `/boxeurs/${slug}` },
  };
}

function statTile(
  icon: React.ReactNode,
  label: string,
  value: string,
  delay: number
) {
  return (
    <Reveal key={label} delay={delay} className="h-full">
      <div className="flex h-full items-center gap-3 rounded-xl border border-line/60 bg-panel px-4 py-3.5 panel-glow">
        <span className="text-neon">{icon}</span>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-fog">{label}</p>
          <p className="font-display text-lg leading-tight text-snow">{value}</p>
        </div>
      </div>
    </Reveal>
  );
}

export default async function FighterPage({ params }: PageProps) {
  const { slug } = await params;
  const { fighter, source } = await getBoxeur(slug);
  if (!fighter) notFound();

  const [recent, upcoming, belts] = await Promise.all([
    getCombatsRecents(30),
    getCombatsAvenir(10),
    getBoxerBelts(slug),
  ]);

  const fightsWith = (fights: Fight[], name: string) =>
    fights.filter((f) =>
      f.fighters.some((ref) => ref.name.toLowerCase() === name.toLowerCase())
    );

  const recentFights = fightsWith(recent.fights, fighter.name);
  const upcomingFights = fightsWith(upcoming.fights, fighter.name);
  const ko = koPct(fighter.record);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fighter.name,
    alternateName: fighter.nickname,
    jobTitle: "Boxeur professionnel",
    nationality: { "@type": "Country", name: fighter.country },
    height: { "@type": "QuantitativeValue", value: fighter.heightCm, unitCode: "CMT" },
    url: `${SITE_URL}/boxeurs/${fighter.slug}`,
    description: `${fighter.name} (${fighter.country}) : ${fighter.weightClass}, ${fighter.record.wins} victoires dont ${fighter.record.ko} par KO.`,
    knowsAbout: [fighter.weightClass, ...fighter.titles],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <JsonLd data={jsonLd} />
      <Link
        href="/boxeurs"
        className="mb-8 inline-flex items-center gap-2 text-sm text-mist transition-colors hover:text-neon"
      >
        <ArrowLeft size={16} aria-hidden /> Retour au répertoire
      </Link>

      {/* ── Hero ─────────────────────────────────────────── */}
      <Reveal>          <div className="relative overflow-hidden rounded-3xl border border-line/60 bg-panel p-6 panel-glow sm:p-10">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 mask-fade-b" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-neon/10 blur-3xl" />

          {/* Favori (compte requis — invisible sinon) */}
          <div className="absolute right-4 top-4 z-10">
            <FavoriteButton fighter={fighter} />
          </div>


          <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:items-end">
            <div className="relative">
              <Avatar name={fighter.name} size="xl" />
              {fighter.rank && fighter.rank <= 5 && (
                <span className="absolute -right-3 -top-3 flex items-center gap-1 rounded-full border border-gold/50 bg-ink px-2.5 py-1 text-xs font-bold text-gold shadow-gold">
                  <Crown size={13} aria-hidden /> #{fighter.rank}
                </span>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-display text-4xl uppercase leading-none tracking-wide text-snow sm:text-6xl">
                {fighter.name}
              </h1>
              {fighter.nickname && (
                <p className="mt-2 text-lg italic text-gold-soft">
                  « {fighter.nickname} »
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="rounded-full border border-line bg-ink/60 px-3 py-1 text-xs text-mist">
                  {fighter.flag} {fighter.country}
                </span>
                <span className="rounded-full border border-neon/50 bg-neon/10 px-3 py-1 text-xs font-semibold text-neon-soft">
                  {fighter.weightClass}
                </span>
                {fighter.promoter && (
                  <span className="rounded-full border border-line bg-ink/60 px-3 py-1 text-xs text-mist">
                    {fighter.promoter}
                  </span>
                )}
                {fighter.boxrecId && (
                  <a
                    href={`https://boxrec.com/en/box-pro/${fighter.boxrecId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-line bg-ink/60 px-3 py-1 text-xs text-mist transition-colors hover:border-gold/60 hover:text-gold"
                  >
                    Voir sur BoxRec ↗
                  </a>
                )}
              </div>

              {fighter.titles.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                  {fighter.titles.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-semibold text-gold ring-1 ring-gold/30"
                    >
                      <Crown size={11} aria-hidden /> {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── Ceintures par organisation ──────────────────── */}
      {belts.length > 0 && (
        <Reveal delay={0.03}>
          <section className="mt-6 rounded-2xl border border-line/60 bg-panel p-6 panel-glow">
            <h2 className="mb-5 font-display text-sm uppercase tracking-[0.3em] text-fog">
              Ceintures par organisation
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {belts.map((org) => (
                <div
                  key={org.org}
                  className="rounded-xl border border-line/60 bg-panel-2 p-4"
                >
                  <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-bold text-gold ring-1 ring-gold/30">
                    <Crown size={11} aria-hidden /> {org.label}
                  </p>
                  <ul className="space-y-1.5">
                    {org.wins.map((w, i) => (
                      <li
                        key={`${w.date}-${i}`}
                        className="flex items-baseline justify-between gap-2 text-xs"
                      >
                        <span className="font-semibold text-snow">{w.belt}</span>
                        <span className="shrink-0 text-fog">
                          {formatDate(w.date)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-fog">
              Ceintures remportées en combat de titre, d’après les résultats
              officiels des organisations (pipeline).
            </p>
          </section>
        </Reveal>
      )}

      {/* ── Palmarès ─────────────────────────────────────── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Reveal delay={0.05}>
          <section className="h-full rounded-2xl border border-line/60 bg-panel p-6 panel-glow">
            <h2 className="mb-5 font-display text-sm uppercase tracking-[0.3em] text-fog">
              Palmarès
            </h2>
            {fighter.record.wins + fighter.record.losses + fighter.record.draws === 0 ? (
              <div className="rounded-xl bg-panel-2 p-6 text-center">
                <p className="text-sm text-mist">
                  Palmarès non publié pour l’instant.
                </p>
                <p className="mt-1 text-xs text-fog">
                  La source de données fournira le palmarès complet dès qu’il
                  sera disponible.
                </p>
              </div>
            ) : (
              <>
                <RecordNumbers record={fighter.record} size="lg" />
                <div className="mt-6">
                  <RecordBar record={fighter.record} />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-panel-2 p-4 text-center">
                    <p className="font-display text-3xl text-gold text-glow-gold">{ko}%</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-fog">
                      Victoires par KO
                    </p>
                  </div>
                  <div className="rounded-xl bg-panel-2 p-4 text-center">
                    <p className="font-display text-3xl text-snow">
                      {fighter.record.wins + fighter.record.losses + fighter.record.draws}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-fog">
                      Combats pro
                    </p>
                  </div>
                </div>
              </>
            )}
          </section>
        </Reveal>

        {/* ── Tale of the tape ───────────────────────────── */}
        <Reveal delay={0.1}>
          <section className="h-full rounded-2xl border border-line/60 bg-panel p-6 panel-glow">
            <h2 className="mb-5 font-display text-sm uppercase tracking-[0.3em] text-fog">
              Fiche technique
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {statTile(<Ruler size={16} aria-hidden />, "Taille", `${fighter.heightCm} cm`, 0.05)}
              {statTile(<Scale size={16} aria-hidden />, "Allonge", fighter.reachCm > 0 ? `${fighter.reachCm} cm` : "—", 0.1)}
              {statTile(<Swords size={16} aria-hidden />, "Garde", fighter.stance, 0.15)}
              {statTile(<Calendar size={16} aria-hidden />, "Âge", `${fighter.age} ans`, 0.2)}
              {statTile(<Calendar size={16} aria-hidden />, "Début pro", String(fighter.debutYear), 0.25)}
              {statTile(<Flag size={16} aria-hidden />, "Nationalité", fighter.country, 0.3)}
            </div>
            {fighter.bio && (
              <p className="mt-6 border-t border-line-soft pt-5 text-sm leading-relaxed text-mist">
                {fighter.bio}
              </p>
            )}
          </section>
        </Reveal>
      </div>

      {/* ── Combats ──────────────────────────────────────── */}
      {(recentFights.length > 0 || upcomingFights.length > 0) && (
        <section className="mt-12">
          <h2 className="mb-6 font-display text-2xl uppercase tracking-wide text-snow">
            Sur le ring
          </h2>
          {upcomingFights.length > 0 && (
            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
                À venir
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcomingFights.map((fight, i) => (
                  <FightCard key={fight.id} fight={fight} index={i} />
                ))}
              </div>
            </div>
          )}
          {recentFights.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-fog">
                Derniers résultats
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {recentFights.map((fight, i) => (
                  <FightCard key={fight.id} fight={fight} index={i} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <p className="mt-10 text-center text-[11px] text-fog">
        Données : {source} · les palmarès sans clé API sont des données de démo
      </p>
    </div>
  );
}
