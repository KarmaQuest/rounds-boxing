import { FighterGridSkeleton } from "@/components/skeleton";

/** Skeleton affiché pendant le chargement de /actualite */
export default function ActualiteLoading() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-3">
        <div className="shimmer mx-auto h-8 w-56 rounded sm:mx-0" />
        <div className="shimmer mx-auto h-4 w-80 rounded sm:mx-0" />
      </div>
      <FighterGridSkeleton count={6} />
    </section>
  );
}
