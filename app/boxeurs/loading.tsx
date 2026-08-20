import { FighterGridSkeleton } from "@/components/skeleton";

/** Skeleton affiché pendant le chargement de /boxeurs */
export default function BoxeursLoading() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-3">
        <div className="shimmer mx-auto h-8 w-64 rounded sm:mx-0" />
        <div className="shimmer mx-auto h-4 w-96 rounded sm:mx-0" />
      </div>
      <FighterGridSkeleton count={12} />
    </section>
  );
}
