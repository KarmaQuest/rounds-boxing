"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  WEIGHT_CLASSES,
  type Fighter,
  type WeightClass,
} from "@/lib/data/types";
import { fuzzySuggest } from "@/lib/data/utils";
import { cn } from "@/lib/utils";

export type SortKey = "rank" | "wins" | "koPct" | "name" | "age" | "height";

export interface FilterState {
  q: string;
  weightClass: WeightClass | "";
  country: string; // "" = tous
  minWins: number;
  minKoPct: number;
  sort: SortKey;
}

export const DEFAULT_FILTERS: FilterState = {
  q: "",
  weightClass: "",
  country: "",
  minWins: 0,
  minKoPct: 0,
  sort: "rank",
};

export function isWeightClass(v: string): v is WeightClass {
  return (WEIGHT_CLASSES as readonly string[]).includes(v);
}

export function isSortKey(v: string): v is SortKey {
  return ["rank", "wins", "koPct", "name", "age", "height"].includes(v);
}

interface FiltersProps {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  fighters: Fighter[];
}

/** Chips de catégories de poids (défilables horizontalement). */
function WeightChips({
  value,
  onChange,
}: {
  value: WeightClass | "";
  onChange: (v: WeightClass | "") => void;
}) {
  return (
    <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <Chip active={value === ""} onClick={() => onChange("")}>
        Toutes
      </Chip>
      {WEIGHT_CLASSES.map((wc) => (
        <Chip key={wc} active={value === wc} onClick={() => onChange(wc)}>
          {wc}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-neon/70 bg-neon/15 text-snow"
          : "border-line bg-panel text-mist hover:border-line hover:bg-panel-2 hover:text-snow"
      )}
    >
      {active && (
        <motion.span
          layoutId="chip-active"
          className="absolute inset-0 -z-10 rounded-full bg-neon/10"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      {children}
    </button>
  );
}

/**
 * Barre de filtres complète. Chaque modification remonte via `onChange`
 * et est synchronisée avec l'URL par la page (partageable).
 */
export function Filters({ filters, onChange, onReset, fighters }: FiltersProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  // Autocomplete flou (TASKS 1.3) : suggestions pendant la frappe.
  const suggestions = useMemo(
    () => (filters.q.trim().length >= 2 ? fuzzySuggest(fighters, filters.q, 5) : []),
    [fighters, filters.q]
  );

  const countries = Array.from(
    new Set(fighters.map((f) => f.country))
  ).sort((a, b) => a.localeCompare(b));

  const activeCount = [
    filters.weightClass !== "",
    filters.country !== "",
    filters.minWins > 0,
    filters.minKoPct > 0,
  ].filter(Boolean).length;

  const hasAny = filters.q !== "" || activeCount > 0;

  return (
    <div className="space-y-4 rounded-2xl border border-line/60 bg-panel/70 p-4 panel-glow sm:p-5">
      {/* Ligne 1 : recherche + tri + reset */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fog" />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => onChange({ q: e.target.value })}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
            placeholder="Rechercher un boxeur, un surnom, un pays…"
            aria-autocomplete="list"
            className="h-11 w-full rounded-full border border-line bg-ink/60 pl-10 pr-4 text-sm text-snow placeholder:text-fog focus:border-neon/70 focus:outline-none focus:ring-2 focus:ring-neon/20"
          />

          {searchFocused && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-panel-2 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.9)]">
              {suggestions.map((f) => (
                <li key={f.slug}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // garde le focus sur l'input
                      onChange({ q: f.name });
                      setSearchFocused(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-panel-3 focus-visible:bg-panel-3"
                  >
                    <span className="text-base" aria-hidden>
                      {f.flag}
                    </span>
                    <span className="truncate font-medium text-snow">{f.name}</span>
                    <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-fog">
                      {f.weightClass}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-line bg-ink/60 px-4 py-2.5 text-xs text-mist">
            <SlidersHorizontal size={14} aria-hidden className="text-neon" />
            <select
              value={filters.sort}
              onChange={(e) => {
                if (isSortKey(e.target.value)) onChange({ sort: e.target.value });
              }}
              className="cursor-pointer bg-transparent text-sm font-medium text-snow focus:outline-none"
            >
              <option value="rank">Meilleurs d’abord</option>
              <option value="wins">Plus de victoires</option>
              <option value="koPct">Ratio KO élevé</option>
              <option value="name">Nom A → Z</option>
              <option value="age">Plus jeunes</option>
              <option value="height">Plus grands</option>
            </select>
          </label>

          {hasAny && (
            <button
              onClick={onReset}
              className="flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-xs font-medium text-mist transition-colors hover:border-neon/60 hover:text-neon"
            >
              <X size={14} aria-hidden /> Réinitialiser
              {activeCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neon/20 text-[10px] font-bold text-neon-soft">
                  {activeCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Ligne 2 : chips catégories */}
      <WeightChips value={filters.weightClass} onChange={(v) => onChange({ weightClass: v })} />

      {/* Ligne 3 : pays + sliders */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <select
          value={filters.country}
          onChange={(e) => onChange({ country: e.target.value })}
          className="h-10 cursor-pointer rounded-full border border-line bg-ink/60 px-4 text-sm text-snow focus:border-neon/70 focus:outline-none"
        >
          <option value="">🌍 Tous les pays</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {fighters.find((f) => f.country === c)?.flag} {c}
            </option>
          ))}
        </select>

        <Slider
          label="Victoires minimum"
          value={filters.minWins}
          max={40}
          onChange={(v) => onChange({ minWins: v })}
        />
        <Slider
          label="% KO minimum"
          value={filters.minKoPct}
          max={100}
          step={5}
          onChange={(v) => onChange({ minKoPct: v })}
        />
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-1 items-center gap-3 text-xs text-mist">
      <span className="w-32 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-neon flex-1"
        style={{ "--fill": `${(value / max) * 100}%` } as React.CSSProperties}
      />
      <span className="w-10 shrink-0 text-right font-display text-sm text-snow">
        {value === 0 ? "—" : `${value}${label.includes("%") ? "%" : ""}`}
      </span>
    </label>
  );
}
