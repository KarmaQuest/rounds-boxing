"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AccountChip } from "@/components/auth/account-chip";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { IconButton } from "@/components/ui/icon-btn";

/**
 * Menu style Rive : barre minimale (logo + burger), burger qui se
 * transforme en croix, puis overlay plein écran avec les liens qui
 * cascadent un par un. Scroll verrouillé tant que le menu est ouvert.
 */

const PRIMARY_KEYS = ["home", "boxeurs", "combats", "comparateur", "actualite"] as const;
const SECONDARY_KEYS = ["debug", "account"] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/#actualites") return false;
  return pathname.startsWith(href);
}

export function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const primaryLinks = PRIMARY_KEYS.map((key) => ({
    key,
    href:
      key === "home" ? "/" : `/${key === "actualite" ? "actualite" : key}`,
    label: t(key),
  }));

  const secondaryLinks = SECONDARY_KEYS.map((key) => ({
    key,
    href: key === "debug" ? "/debug" : "/dashboard",
    label: t(key),
  }));

  // verrouille le scroll tant que le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Échap ferme le menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // quand on navigue (clic sur un lien), on referme
  const close = () => setOpen(false);

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-line/60 bg-ink/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2" onClick={close}>
          <motion.span
            whileHover={{ rotate: -12 }}
            className="text-2xl"
            aria-hidden
          >
            🥊
          </motion.span>
          <span className="font-display text-2xl uppercase tracking-widest text-snow">
            ROUND<span className="text-neon text-glow-red">S</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <AccountChip />
          <ThemeToggle />
          <LanguageSwitcher />

          {/* Burger animé (3 traits → croix) */}
          <IconButton
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-principal"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            className="group relative"
          >
            <span className="relative block h-3.5 w-5">
              <span
                className={`absolute left-0 top-0 block h-0.5 w-full rounded-full bg-snow transition-all duration-300 ${
                  open ? "top-1/2 -translate-y-1/2 rotate-45 bg-neon" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 block h-0.5 w-full -translate-y-1/2 rounded-full bg-snow transition-all duration-300 ${
                  open ? "opacity-0 scale-x-0" : ""
                }`}
              />
              <span
                className={`absolute bottom-0 left-0 block h-0.5 w-full rounded-full bg-snow transition-all duration-300 ${
                  open ? "bottom-1/2 translate-y-1/2 -rotate-45 bg-neon" : ""
                }`}
              />
            </span>
          </IconButton>
        </div>
      </nav>
    </header>

      {/* Overlay plein écran — FRÈRE du header : un backdrop-filter sur le
          header créerait un containing block qui casse le `fixed` (menu de
          hauteur 0). Positionné sur le viewport, sous le header (z-40 < z-50). */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-principal"
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 top-16 z-40 flex flex-col overflow-y-auto bg-ink/95 backdrop-blur-2xl"
          >
            {/* lueur décorative */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-neon/10 blur-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            />

            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 py-10 sm:px-10">
              <ul className="space-y-1">
                {primaryLinks.map((link, i) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <li key={link.href} className="overflow-hidden">
                      <motion.div
                        initial={{ y: 70, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{
                          delay: 0.06 + i * 0.06,
                          duration: 0.5,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <Link
                          href={link.href}
                          onClick={close}
                          className={`group flex items-baseline gap-4 py-1.5 transition-colors ${
                            active ? "text-neon" : "text-snow"
                          }`}
                        >
                          <span className="font-display text-xs uppercase tracking-[0.3em] text-fog transition-colors group-hover:text-neon">
                            0{i + 1}
                          </span>
                          <span className="font-display text-4xl uppercase tracking-wide transition-all duration-300 group-hover:translate-x-2 group-hover:text-neon-soft sm:text-6xl">
                            {link.label}
                          </span>
                        </Link>
                      </motion.div>
                    </li>
                  );
                })}
              </ul>

              {/* liens secondaires */}
              <motion.ul
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-line/60 pt-6 text-sm text-mist"
              >
                {secondaryLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={close}
                      className="link-underline transition-colors hover:text-neon"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </motion.ul>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.65 }}
              className="border-t border-line/40 px-6 py-4 text-center text-[11px] uppercase tracking-[0.3em] text-fog sm:px-10"
            >
              {t("tagline")}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}