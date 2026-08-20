import { FightCardSkeleton } from "@/components/skeleton";

/** Skeleton affiché pendant le chargement de /comparateur */
export default function ComparateurLoading() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-3">
        <div className="shimmer mx-auto h-8 w-64 rounded sm:mx-0" />
        <div className="shimmer mx-auto h-4 w-48 rounded sm:mx-0" />
      </div>
      <FightCardSkeleton />
    </section>
  );
}
