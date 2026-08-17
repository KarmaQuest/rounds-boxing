import type { Metadata } from "next";
import { ProgrammationSection } from "@/components/combats/programmation";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Combats à venir par organisation",
  description:
    "Tous les combats professionnels et amateurs annoncés par les organisations de boxe (WBC, IBF, FFBoxe…), extraits des calendriers officiels et vérifiés par IA.",
  alternates: { canonical: "/combats-a-venir" },
};

export default function CombatsAVenirPage() {
  return (
    <div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Combats à venir par organisation",
          description:
            "Programmation officielle des organisations de boxe, vérifiée par IA.",
        }}
      />
      <ProgrammationSection />
    </div>
  );
}
