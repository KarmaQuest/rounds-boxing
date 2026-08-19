"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";

export function LogoutButton({ variant = "default" }: { variant?: "default" | "compact" }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className={
        variant === "compact"
          ? "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-mist transition-colors hover:text-neon disabled:opacity-60"
          : "sheen relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-line px-5 py-2.5 text-sm font-medium text-mist transition-all hover:border-neon/60 hover:text-neon disabled:opacity-60"
      }
    >
      {loading ? (
        <Loader2 size={15} aria-hidden className="animate-spin" />
      ) : (
        <LogOut size={15} aria-hidden />
      )}
      {t("logout")}
    </button>
  );
}