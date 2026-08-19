import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-line/60 bg-panel/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-display text-2xl uppercase tracking-widest text-snow">
              ROUND<span className="text-neon">S</span>
            </p>
            <p className="mt-2 max-w-sm text-sm text-mist">{t("intro")}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-fog">
                {t("navigation")}
              </p>
              <ul className="space-y-2 text-mist">
                <li><Link href="/" className="hover:text-neon">{t("home")}</Link></li>
                <li><Link href="/boxeurs" className="hover:text-neon">{t("boxeurs")}</Link></li>
                <li><Link href="/combats" className="hover:text-neon">{t("combats")}</Link></li>
                <li><Link href="/comparateur" className="hover:text-neon">{t("comparateur")}</Link></li>
                <li><Link href="/debug" className="hover:text-neon">{t("debug")}</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-fog">
                {t("sources")}
              </p>
              <ul className="space-y-2 text-mist">
                <li>{t("bigballs")}</li>
                <li>{t("thesportsdb")}</li>
                <li>{t("odds")}</li>
                <li>{t("wikipedia")}</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-8 border-t border-line-soft pt-6 text-xs text-fog">
          {t("disclaimer")}
        </p>
      </div>
    </footer>
  );
}