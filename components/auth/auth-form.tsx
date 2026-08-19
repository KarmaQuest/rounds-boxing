"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import Link from "next/link";
import { Loader2, Lock, Mail } from "lucide-react";
import { isAuthErrorCode } from "@/lib/i18n/api-errors";

interface AuthFormProps {
  mode: "login" | "register";
}

/**
 * Formulaire connexion / inscription partagé. Au succès, redirige vers le
 * paramètre `next` (défini par le proxy) ou le dashboard.
 */
export function AuthForm({ mode }: AuthFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data.errorCode;
        setError(
          isAuthErrorCode(code)
            ? t(`errors.${code}`)
            : (data.error ?? t("genericError"))
        );
        setLoading(false);
        return;
      }
      const next = sp.get("next");
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch {
      setError(t("networkError"));
      setLoading(false);
    }
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5 rounded-2xl border border-line/60 bg-panel p-6 panel-glow sm:p-8"
    >
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-fog">
          {t("email")}
        </label>
        <div className="relative">
          <Mail size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fog" />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@exemple.fr"
            className="h-11 w-full rounded-full border border-line bg-ink/60 pl-10 pr-4 text-sm text-snow placeholder:text-fog focus:border-neon/70 focus:outline-none focus:ring-2 focus:ring-neon/20"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-fog">
          {t("password")}
        </label>
        <div className="relative">
          <Lock size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fog" />
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete={isLogin ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordMin")}
            className="h-11 w-full rounded-full border border-line bg-ink/60 pl-10 pr-4 text-sm text-snow placeholder:text-fog focus:border-neon/70 focus:outline-none focus:ring-2 focus:ring-neon/20"
          />
        </div>
      </div>

      {error && (
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
        disabled={loading}
        className="sheen relative w-full overflow-hidden rounded-full bg-neon px-6 py-3 font-display text-sm uppercase tracking-widest text-white shadow-neon transition-all hover:shadow-neon hover:brightness-110 disabled:opacity-60"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={16} aria-hidden className="animate-spin" /> {t("unInstant")}
          </span>
        ) : isLogin ? (
          t("login")
        ) : (
          t("register")
        )}
      </button>

      <p className="text-center text-sm text-mist">
        {isLogin ? (
          <>
            {t("noAccount")}{" "}
            <Link href="/inscription" className="font-medium text-neon-soft hover:underline">
              {t("signup")}
            </Link>
          </>
        ) : (
          <>
            {t("already")}{" "}
            <Link href="/connexion" className="font-medium text-neon-soft hover:underline">
              {t("login")}
            </Link>
          </>
        )}
      </p>
    </motion.form>
  );
}