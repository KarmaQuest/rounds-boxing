import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-red-600/80 to-orange-500/60",
  "from-violet-600/80 to-fuchsia-500/60",
  "from-emerald-600/80 to-cyan-500/60",
  "from-amber-500/80 to-yellow-400/60",
  "from-sky-600/80 to-blue-500/60",
  "from-rose-600/80 to-red-400/60",
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-lg",
  lg: "h-20 w-20 text-2xl",
  xl: "h-32 w-32 text-5xl",
};

/** Avatar circulaire avec dégradé déterministe par nom + anneau néon. */
export function Avatar({ name, size = "md", className }: AvatarProps) {
  const grad = GRADIENTS[hash(name) % GRADIENTS.length]!;
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-2 ring-line",
        grad,
        SIZES[size],
        className
      )}
      aria-hidden
    >
      <span className="font-display uppercase tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
        {initials(name)}
      </span>
      <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_-8px_16px_rgba(0,0,0,0.35)]" />
    </div>
  );
}
