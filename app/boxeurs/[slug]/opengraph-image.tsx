import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { cookies } from "next/headers";
import { getBoxeur } from "@/lib/data";
import { koPct, recordLabel } from "@/lib/data/utils";
import { titleLabel, weightClassLabel, countryLabel, toLocale } from "@/lib/i18n/data";

export const runtime = "nodejs";
export const alt = "Profil boxeur — ROUNDS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const anton = await readFile(join(process.cwd(), "public/fonts/Anton-Regular.ttf"));

const COPY = {
  fr: {
    profile: "Profil boxeur",
    notFound: "Boxeur introuvable",
    ko: "% KO",
    footer: "Boxe · Palmarès & combats",
  },
  en: {
    profile: "Boxer profile",
    notFound: "Boxer not found",
    ko: "% KO",
    footer: "Boxing · Records & fights",
  },
} as const;

/** Mêmes dégradés déterministes que components/avatar.tsx. */
const GRADIENTS: Array<[string, string]> = [
  ["#dc2626", "#f97316"],
  ["#7c3aed", "#d946ef"],
  ["#059669", "#06b6d4"],
  ["#d97706", "#facc15"],
  ["#0284c7", "#3b82f6"],
  ["#e11d48", "#ef4444"],
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

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = toLocale((await cookies()).get("NEXT_LOCALE")?.value);
  const copy = COPY[locale];
  const { fighter } = await getBoxeur(slug);

  const name = titleLabel(fighter?.name ?? "", locale) || copy.notFound;
  const nickname = fighter?.nickname;
  const country = countryLabel(fighter?.country ?? "", locale);
  const weightClass = weightClassLabel(fighter?.weightClass ?? "", locale);
  const record = fighter?.record;
  const [from, to] = GRADIENTS[hash(name) % GRADIENTS.length]!;
  const nameSize = name.length > 20 ? 52 : 64;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#07070c",
          backgroundImage:
            "radial-gradient(circle at 88% 8%, rgba(255,46,46,0.28), transparent 45%)",
          color: "#f5f5f7",
          fontFamily: "Anton",
          padding: "56px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            gap: 64,
          }}
        >
          {/* Avatar circulaire (comme sur le site) */}
          <div
            style={{
              width: 216,
              height: 216,
              borderRadius: "50%",
              backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 -18px 32px rgba(0,0,0,0.35), 0 0 60px rgba(255,46,46,0.25)",
            }}
          >
            <span
              style={{
                fontSize: 96,
                letterSpacing: 2,
                color: "#ffffff",
                textShadow: "0 4px 16px rgba(0,0,0,0.55)",
              }}
            >
              {initials(name)}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                fontSize: 20,
                letterSpacing: 6,
                color: "#ff2e2e",
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              ROUNDS · {copy.profile}
            </div>

            <div
              style={{
                fontSize: nameSize,
                lineHeight: 1.05,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: "#f5f5f7",
              }}
            >
              {name}
            </div>

            {nickname && (
              <div
                style={{
                  display: "flex", // texte mixte (« + {nickname} + ») : satori exige un display
                  fontSize: 26,
                  color: "#f2b53c",
                  marginTop: 8,
                }}
              >
                « {nickname} »
              </div>
            )}

            {record && (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 20,
                  marginTop: 26,
                }}
              >
                <span
                  style={{
                    fontSize: 84,
                    color: "#f2b53c",
                    lineHeight: 1,
                  }}
                >
                  {recordLabel(record)}
                </span>
                <span
                  style={{
                    display: "flex", // texte mixte ({koPct} + "% KO") : satori exige un display
                    fontSize: 24,
                    letterSpacing: 2,
                    color: "#a2a2b3",
                  }}
                >
                  {koPct(record)}% {copy.ko}
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
              {weightClass && (
                <span
                  style={{
                    fontSize: 20,
                    letterSpacing: 2,
                    color: "#ff2e2e",
                    textTransform: "uppercase",
                    border: "2px solid rgba(255,46,46,0.55)",
                    borderRadius: 999,
                    padding: "8px 20px",
                  }}
                >
                  {weightClass}
                </span>
              )}
              {country && (
                <span
                  style={{
                    fontSize: 20,
                    letterSpacing: 2,
                    color: "#a2a2b3",
                    textTransform: "uppercase",
                    border: "2px solid rgba(162,162,179,0.35)",
                    borderRadius: 999,
                    padding: "8px 20px",
                  }}
                >
                  {country}
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 16,
            letterSpacing: 3,
            color: "#6d6d7d",
            textTransform: "uppercase",
          }}
        >
          <span>ROUNDS</span>
          <span>{copy.footer}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Anton", data: anton, weight: 400, style: "normal" }],
    }
  );
}
