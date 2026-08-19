"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { isAuthErrorCode } from "@/lib/i18n/api-errors";

export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        const code = data.errorCode;
        setError(
          isAuthErrorCode(code)
            ? t(`errors.${code}`)
            : (data.error ?? t("genericError"))
        );
        return;
      }
      setStatus("ok");
      setOldPassword("");
      setNewPassword("");
    } catch {
      setStatus("error");
      setError(t("networkError"));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="oldPassword" className="text-xs font-semibold uppercase tracking-wider text-fog">
          {t("currentPassword")}
        </label>
        <input
          id="oldPassword"
          type="password"
          required
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          className="h-11 w-full rounded-full border border-line bg-ink/60 px-4 text-sm text-snow placeholder:text-fog focus:border-neon/70 focus:outline-none focus:ring-2 focus:ring-neon/20"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wider text-fog">
          {t("newPassword")}
        </label>
        <input
          id="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="h-11 w-full rounded-full border border-line bg-ink/60 px-4 text-sm text-snow placeholder:text-fog focus:border-neon/70 focus:outline-none focus:ring-2 focus:ring-neon/20"
        />
      </div>

      {status === "ok" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-win/40 bg-win/10 px-4 py-2.5 text-sm text-win"
        >
          {t("updated")} ✅
        </motion.p>
      )}
      {status === "error" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          role="alert"
          className="rounded-xl border border-loss/40 bg-loss/10 px-4 py-2.5 text-sm text-neon-soft"
        >
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="sheen relative w-full overflow-hidden rounded-full border border-neon/60 px-6 py-2.5 text-sm font-medium text-neon-soft transition-all hover:bg-neon/10 disabled:opacity-60"
      >
        {status === "loading" ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={15} aria-hidden className="animate-spin" /> {t("unInstant")}
          </span>
        ) : (
          t("update")
        )}
      </button>
    </form>
  );
}