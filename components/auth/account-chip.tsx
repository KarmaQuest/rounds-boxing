"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { UserRound } from "lucide-react";

interface MeResponse {
  user?: { id: number; email: string; createdAt: string };
}

/** État d'authentification courant (léger, mis en cache). */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<MeResponse | null> => {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });
}

/** Chip du navbar : « Connexion » ou avatar → dashboard. */
export function AccountChip() {
  const t = useTranslations("nav");
  const { data } = useMe();
  const user = data?.user;

  if (!user) {
    return (
      <Link
        href="/connexion"
        className="sheen relative hidden items-center gap-2 overflow-hidden rounded-full border border-neon/50 px-4 py-1.5 text-sm font-medium text-neon-soft transition-all hover:bg-neon/10 sm:inline-flex"
      >
        <UserRound size={14} aria-hidden /> {t("login")}
      </Link>
    );
  }

  const initial = user.email[0]!.toUpperCase();
  return (
    <Link
      href="/dashboard"
      aria-label={t("dashboard", { email: user.email })}
      className="group flex items-center gap-2 rounded-full border border-line bg-panel py-1 pl-1 pr-3 transition-all hover:border-neon/50"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neon/15 font-display text-sm text-neon-soft ring-1 ring-neon/40">
        {initial}
      </span>
      <span className="hidden max-w-[8rem] truncate text-sm text-snow group-hover:text-neon-soft sm:block">
        {user.email.split("@")[0]}
      </span>
    </Link>
  );
}
