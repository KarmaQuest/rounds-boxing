import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Heart, Mail, User } from "lucide-react";
import { getCurrentUser, publicUser } from "@/lib/auth/session";
import { listFavoriteSlugs } from "@/lib/auth/db";
import { getBoxeur } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { FighterCard } from "@/components/fighter-card";
import { ChangePasswordForm } from "@/components/auth/change-password";
import { LogoutButton } from "@/components/auth/logout-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta.dashboard");
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
    alternates: { canonical: "/dashboard" },
  };
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");

  const slugs = listFavoriteSlugs(user.id);
  const favorites = (
    await Promise.all(slugs.map((slug) => getBoxeur(slug)))
  )
    .map((r) => r.fighter)
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

  const me = publicUser(user);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow sm:text-5xl">
            {t("title")}
          </h1>
        </div>
        <LogoutButton />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Profil ─────────────────────────────────────── */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-line/60 bg-panel p-6 panel-glow">
            <h2 className="mb-4 font-display text-sm uppercase tracking-[0.3em] text-fog">
              {t("profile")}
            </h2>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neon/10 text-neon ring-1 ring-neon/40">
                <User size={22} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-lg uppercase text-snow">
                  {me.email.split("@")[0]}
                </p>
                <p className="flex items-center gap-1.5 truncate text-xs text-mist">
                  <Mail size={12} aria-hidden /> {me.email}
                </p>
              </div>
            </div>
            <p className="mt-4 border-t border-line-soft pt-4 text-xs text-fog">
              {t("memberSince", {
                date: formatDate(
                  me.createdAt,
                  { year: "numeric", month: "long", day: "numeric" },
                  locale === "en" ? "en-US" : "fr-FR"
                ),
              })}
            </p>
          </section>

          <section className="rounded-2xl border border-line/60 bg-panel p-6 panel-glow">
            <h2 className="mb-4 font-display text-sm uppercase tracking-[0.3em] text-fog">
              {t("password")}
            </h2>
            <ChangePasswordForm />
          </section>
        </div>

        {/* ── Favoris ────────────────────────────────────── */}
        <section>
          <h2 className="mb-5 flex items-center gap-2 font-display text-2xl uppercase tracking-wide text-snow">
            <Heart size={20} aria-hidden className="text-neon" /> {t("myBoxeurs", { count: favorites.length })}
          </h2>

          {favorites.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-16 text-center">
              <Heart size={36} aria-hidden className="text-fog" />
              <p className="font-display text-xl uppercase text-snow">
                {t("noFav")}
              </p>
              <p className="max-w-sm text-sm text-mist">{t("noFavText")}</p>
              <Link
                href="/boxeurs"
                className="sheen relative mt-2 overflow-hidden rounded-full bg-neon px-6 py-2.5 font-display text-sm uppercase tracking-widest text-white shadow-neon transition-all hover:brightness-110"
              >
                {t("seeBoxeurs")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {favorites.map((fighter, i) => (
                <FighterCard key={fighter.slug} fighter={fighter} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}