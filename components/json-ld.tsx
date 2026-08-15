/**
 * Injection de données structurées (JSON-LD / schema.org) côté serveur.
 * Utilisation : <JsonLd data={{ "@type": "Person", … }} />
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
