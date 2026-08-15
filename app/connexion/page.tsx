import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi à ROUNDS pour gérer tes favoris.",
  alternates: { canonical: "/connexion" },
};

export default function ConnexionPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
          Compte
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow">
          Connexion
        </h1>
        <p className="mt-3 text-sm text-mist">
          Retrouve tes boxeurs favoris sur ton dashboard.
        </p>
      </div>
      <Suspense fallback={<p className="text-center text-sm text-fog">Chargement…</p>}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
