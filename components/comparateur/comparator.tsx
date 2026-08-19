"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Swords } from "lucide-react";
import type { Fighter } from "@/lib/data/types";
import { koPct } from "@/lib/data/utils";
import { countryLabel, toLocale, weightClassLabel } from "@/lib/i18n/data";
import { Avatar } from "@/components/avatar";
import { RecordBar, RecordNumbers } from "@/components/record-bar";
import { cn } from "@/lib/utils";

interface ApiResponse {
  fighters: Fighter[];
}

interface ApiFighter {
  fighter: Fighter;
}

/**
 * Charge le répertoire (top 500) + résout les boxeurs demandés par URL
 * même s'ils sont hors du pool (ex. boxeurs des calendriers officiels).
 */
async function fetchFighters(slugA: string, slugB: string): Promise<ApiResponse> {
  const [poolRes, ...dedicated] = await Promise.all([
    fetch("/api/boxeurs?limit=500"),
    ...[slugA, slugB].filter(Boolean).map(async (slug) => {
      const res = await fetch(`/api/boxeurs/${encodeURIComponent(slug)}`);
      if (!res.ok) return null;
      const json = (await res.json()) as ApiFighter;
      return json.fighter ?? null;
    }),
  ]);
  if (!poolRes.ok) throw new Error("Échec du chargement");
  const pool = (await poolRes.json()) as ApiResponse;

  // fusion : les fiches dédiées complètent le pool (dédup par slug)
  const bySlug = new Map(pool.fighters.map((f) => [f.slug, f]));
  for (const fighter of dedicated) {
    if (fighter) bySlug.set(fighter.slug, fighter);
  }
  return { fighters: [...bySlug.values()] };
}

/** Colonne gagnante d'un comparatif numérique. */
type Side = "a" | "b" | "tie";
function better(a: number, b: number, mode: "max" | "min"): Side {
  if (mode === "max") return a > b ? "a" : b > a ? "b" : "tie";
  return a < b ? "a" : b < a ? "b" : "tie";
}

interface StatRow {
  key: string;
  label: string;
  a: string;
  b: string;
  win?: Side;
}

function buildRows(
  a: Fighter,
  b: Fighter,
  t: (key: string) => string
): StatRow[] {
  const koA = koPct(a.record);
  const koB = koPct(b.record);
  const rows: StatRow[] = [
    {
      key: "wins",
      label: t("wins"),
      a: String(a.record.wins),
      b: String(b.record.wins),
      win: better(a.record.wins, b.record.wins, "max"),
    },
    {
      key: "losses",
      label: t("losses"),
      a: String(a.record.losses),
      b: String(b.record.losses),
      win: better(a.record.losses, b.record.losses, "min"),
    },
    {
      key: "koPct",
      label: t("koPct"),
      a: `${koA}%`,
      b: `${koB}%`,
      win: better(koA, koB, "max"),
    },
    {
      key: "height",
      label: t("height"),
      a: a.heightCm > 0 ? `${a.heightCm} cm` : "—",
      b: b.heightCm > 0 ? `${b.heightCm} cm` : "—",
      win: a.heightCm > 0 && b.heightCm > 0 ? better(a.heightCm, b.heightCm, "max") : "tie",
    },
    {
      key: "reach",
      label: t("reach"),
      a: a.reachCm > 0 ? `${a.reachCm} cm` : "—",
      b: b.reachCm > 0 ? `${b.reachCm} cm` : "—",
      win: a.reachCm > 0 && b.reachCm > 0 ? better(a.reachCm, b.reachCm, "max") : "tie",
    },
    {
      key: "age",
      label: t("age"),
      a: `${a.age} ans`,
      b: `${b.age} ans`,
      win: better(a.age, b.age, "min"),
    },
    {
      key: "debut",
      label: t("debut"),
      a: String(a.debutYear),
      b: String(b.debutYear),
      win: better(a.debutYear, b.debutYear, "min"),
    },
  ];
  return rows;
}

function Selector({
  label,
  value,
  onChange,
  fighters,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (slug: string) => void;
  fighters: Fighter[];
  placeholder: string;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-fog">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full cursor-pointer rounded-full border border-line bg-ink/60 px-4 text-sm text-snow focus:border-neon/70 focus:outline-none"
      >
        <option value="">{placeholder}</option>
        {fighters.map((f) => (
          <option key={f.slug} value={f.slug}>
            {f.flag} {f.name} — {f.record.wins}-{f.record.losses}-{f.record.draws}
          </option>
        ))}
      </select>
    </label>
  );
}

function FighterColumn({ fighter }: { fighter: Fighter }) {
  const locale = toLocale(useLocale());
  return (
    <div className="rounded-2xl border border-line/60 bg-panel p-6 panel-glow">
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar name={fighter.name} size="xl" />
        <div>
          <h2 className="font-display text-2xl uppercase leading-tight tracking-wide text-snow sm:text-3xl">
            {fighter.name}
          </h2>
          {fighter.nickname && (
            <p className="mt-0.5 text-sm italic text-gold-soft">« {fighter.nickname} »</p>
          )}
          <p className="mt-2 text-xs text-mist">
            {fighter.flag} {countryLabel(fighter.country, locale)} · {weightClassLabel(fighter.weightClass, locale)}
          </p>
        </div>
      </div>

      {fighter.titles.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {fighter.titles.slice(0, 3).map((title) => (
            <span
              key={title}
              className="rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-semibold text-gold ring-1 ring-gold/30"
            >
              {title}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5">
        <RecordNumbers record={fighter.record} size="md" />
        <div className="mt-3">
          <RecordBar record={fighter.record} />
        </div>
      </div>
    </div>
  );
}

/**
 * Comparateur « tale of the tape » : deux sélecteurs synchronisés dans
 * l'URL (?boxeurA=&boxeurB=) + comparaison côte à côte, stats gagnantes
 * mises en or.
 */
export function Comparateur() {
  const t = useTranslations("comparateur");
  const router = useRouter();
  const sp = useSearchParams();

  const slugA = sp.get("boxeurA") ?? "";
  const slugB = sp.get("boxeurB") ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["boxeurs", slugA, slugB],
    queryFn: () => fetchFighters(slugA, slugB),
    staleTime: 1000 * 60 * 10,
  });

  const fighters = useMemo(() => data?.fighters ?? [], [data]);
  const a = fighters.find((f) => f.slug === slugA);
  const b = fighters.find((f) => f.slug === slugB);

  const setSlug = (side: "a" | "b", slug: string) => {
    const params = new URLSearchParams();
    if (side === "a") {
      if (slug) params.set("boxeurA", slug);
      if (slugB) params.set("boxeurB", slugB);
    } else {
      if (slugA) params.set("boxeurA", slugA);
      if (slug) params.set("boxeurB", slug);
    }
    const qs = params.toString();
    router.replace(qs ? `/comparateur?${qs}` : "/comparateur", { scroll: false });
  };

  if (isError) {
    return (
      <p className="rounded-2xl border border-loss/40 bg-loss/10 p-10 text-center text-mist">
        {t("error")}
      </p>
    );
  }

  const rows = a && b ? buildRows(a, b, (key) => t(key)) : [];
  const winStats = new Set<string>();
  for (const row of rows) {
    if (row.win === "a") winStats.add(`${row.key}:a`);
    if (row.win === "b") winStats.add(`${row.key}:b`);
  }

  return (
    <div className="space-y-6">
      {/* sélecteurs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Selector
          label={t("boxeurA")}
          value={slugA}
          onChange={(s) => setSlug("a", s)}
          fighters={fighters}
          placeholder={t("chooseA")}
        />
        <div className="hidden pb-2.5 text-neon sm:block" aria-hidden>
          <Swords size={20} />
        </div>
        <Selector
          label={t("boxeurB")}
          value={slugB}
          onChange={(s) => setSlug("b", s)}
          fighters={fighters}
          placeholder={t("chooseB")}
        />
      </div>

      {isLoading && (
        <p className="text-center text-sm text-fog">{t("loadingDirectory")}</p>
      )}

      {!isLoading && a && b && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <FighterColumn fighter={a} />
            <FighterColumn fighter={b} />
          </div>

          {/* tableau comparatif */}
          <div className="overflow-hidden rounded-2xl border border-line/60 bg-panel panel-glow">
            <table className="w-full text-sm">
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-line-soft last:border-0">
                    <td className="w-[26%] px-4 py-2.5 text-xs uppercase tracking-wider text-fog">
                      {row.label}
                    </td>
                    <td
                      className={cn(
                        "w-[37%] px-4 py-2.5 text-right font-display text-base",
                        winStats.has(`${row.key}:a`) ? "text-gold" : "text-snow"
                      )}
                    >
                      {row.a}
                    </td>
                    <td className="w-0 px-2 text-center text-[10px] uppercase tracking-widest text-mist">
                      vs
                    </td>
                    <td
                      className={cn(
                        "w-[37%] px-4 py-2.5 font-display text-base",
                        winStats.has(`${row.key}:b`) ? "text-gold" : "text-snow"
                      )}
                    >
                      {row.b}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!isLoading && !(a && b) && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-16 text-center">
          <Swords size={36} aria-hidden className="text-fog" />
          <p className="font-display text-xl uppercase text-snow">{t("emptyTitle")}</p>
          <p className="max-w-sm text-sm text-mist">{t("emptyText")}</p>
        </div>
      )}
    </div>
  );
}