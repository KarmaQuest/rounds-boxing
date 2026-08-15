import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line/60 bg-panel/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-display text-2xl uppercase tracking-widest text-snow">
              ROUND<span className="text-neon">S</span>
            </p>
            <p className="mt-2 max-w-sm text-sm text-mist">
              Palmarès, profils et combats des plus grands boxeurs du monde.
              Données agrégées depuis plusieurs sources et mises en cache.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-fog">
                Navigation
              </p>
              <ul className="space-y-2 text-mist">
                <li><Link href="/" className="hover:text-neon">Accueil</Link></li>
                <li><Link href="/boxeurs" className="hover:text-neon">Boxeurs</Link></li>
                <li><Link href="/combats" className="hover:text-neon">Combats</Link></li>
                <li><Link href="/comparateur" className="hover:text-neon">Comparateur</Link></li>
                <li><Link href="/debug" className="hover:text-neon">État des sources</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-fog">
                Sources de données
              </p>
              <ul className="space-y-2 text-mist">
                <li>Big Balls Sports Data</li>
                <li>TheSportsDB</li>
                <li>The Odds API</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-8 border-t border-line-soft pt-6 text-xs text-fog">
          Démo — les palmarès affichés sans clé API sont approximatifs.
          Projet Next.js · React · Tailwind · Framer Motion.
        </p>
      </div>
    </footer>
  );
}
