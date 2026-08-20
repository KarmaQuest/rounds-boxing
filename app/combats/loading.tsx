import { FightCardSkeleton } from "@/components/skeleton";

/** Skeleton affiché pendant le chargement de /combats */
export default function CombatsLoading() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-3">
        <div className="shimmer mx-auto h-8 w-48 rounded sm:mx-0" />
        <div className="shimmer mx-auto h-4 w-72 rounded sm:mx-0" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <FightCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
