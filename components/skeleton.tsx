import { cn } from "@/lib/utils";

export function FighterCardSkeleton() {
  return (
    <div className="card p-5 panel-glow">
      <div className="flex items-center gap-4">
        <div className="shimmer h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="shimmer h-4 w-2/3 rounded" />
          <div className="shimmer h-3 w-1/3 rounded" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <div className="shimmer h-3 w-full rounded" />
        <div className="shimmer h-3 w-4/5 rounded" />
      </div>
    </div>
  );
}

export function FighterGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <FighterCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FightCardSkeleton() {
  return (
    <div className="card p-6 panel-glow">
      <div className="shimmer mx-auto mb-4 h-3 w-40 rounded" />
      <div className="flex items-center justify-between gap-4">
        <div className="shimmer h-10 w-10 rounded-full" />
        <div className="shimmer h-4 w-12 rounded" />
        <div className="shimmer h-10 w-10 rounded-full" />
      </div>
      <div className="shimmer mx-auto mt-4 h-3 w-2/3 rounded" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
        <div className="shimmer h-32 w-32 rounded-full" />
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div className="shimmer mx-auto h-8 w-64 rounded sm:mx-0" />
          <div className="shimmer mx-auto h-4 w-40 rounded sm:mx-0" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="shimmer h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Petite pastille shimmer pour les chips de filtres. */
export function ChipSkeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer h-9 w-24 rounded-full", className)} />;
}
