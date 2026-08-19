"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import type { Fighter } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/** Cœur « favori » sur les cartes boxeurs — visible uniquement connecté. */
export function FavoriteButton({ fighter, className }: { fighter: Fighter; className?: string }) {
  const t = useTranslations("auth");
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      return res.ok ? res.json() : null;
    },
    staleTime: 60_000,
  });

  const { data: favs } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites", { cache: "no-store" });
      return res.ok ? res.json() : { slugs: [] as string[] };
    },
    enabled: Boolean(me?.user),
    staleTime: 30_000,
  });

  const isFav = (favs?.slugs as string[] | undefined)?.includes(fighter.slug) ?? false;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/favorites/${fighter.slug}`, {
        method: isFav ? "DELETE" : "PUT",
      });
      if (!res.ok) throw new Error("favori impossible");
      return res.json() as Promise<{ favorite: boolean; slug: string }>;
    },
    onSuccess: (data) => {
      const prev = qc.getQueryData<{ slugs: string[] }>(["favorites"]);
      const set = new Set(prev?.slugs ?? []);
      if (data.favorite) set.add(data.slug);
      else set.delete(data.slug);
      qc.setQueryData(["favorites"], { slugs: [...set] });
    },
  });

  if (!me?.user) return null;

  return (
    <motion.button
      type="button"
      onClick={() => mutation.mutate()}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.85 }}
      aria-label={isFav ? t("removeFavorite", { name: fighter.name }) : t("addFavorite", { name: fighter.name })}
      aria-pressed={isFav}
      disabled={mutation.isPending}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
        isFav
          ? "border-neon/60 bg-neon/15 text-neon"
          : "border-line bg-ink/60 text-mist hover:border-neon/50 hover:text-neon",
        className
      )}
    >
      <Heart
        size={15}
        aria-hidden
        className={cn(isFav && "fill-neon")}
      />
    </motion.button>
  );
}
