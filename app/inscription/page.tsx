import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Inscription",
  description: "Crée ton compte ROUNDS : favoris, dashboard et plus.",
  alternates: { canonical: "/inscription" },
};

export default function InscriptionPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-soft">
          Compte
        </p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-wide text-snow">
          Inscription
        </h1>
        <p className="mt-3 text-sm text-mist">
          Un compte gratuit pour épingler tes boxeurs préférés.
        </p>
      </div>
      <Suspense fallback={<p className="text-center text-sm text-fog">Chargement…</p>}>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}
