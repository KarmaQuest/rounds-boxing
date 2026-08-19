import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { cookies } from "next/headers";
import { toLocale } from "@/lib/i18n/data";

export const runtime = "nodejs";
export const alt = "ROUNDS — Les records de la boxe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const anton = await readFile(join(process.cwd(), "public/fonts/Anton-Regular.ttf"));

const COPY = {
  fr: {
    tagline: "Répertoire de la boxe",
    sub: "Les records de la boxe",
    meta: "Palmarès · Profils · Combats & cotes",
    footer: "Boxe · Toutes catégories",
  },
  en: {
    tagline: "Boxing directory",
    sub: "Boxing records",
    meta: "Records · Profiles · Fights & odds",
    footer: "Boxing · All weight classes",
  },
} as const;

export default async function Image() {
  const locale = toLocale((await cookies()).get("NEXT_LOCALE")?.value);
  const copy = COPY[locale];

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
            "radial-gradient(circle at 82% 12%, rgba(255,46,46,0.35), transparent 42%), radial-gradient(circle at 10% 95%, rgba(242,181,60,0.16), transparent 40%)",
          color: "#f5f5f7",
          fontFamily: "Anton",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 26,
              letterSpacing: 8,
              color: "#ff2e2e",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            {copy.tagline}
          </div>
          <div
            style={{
              fontSize: 168,
              letterSpacing: 10,
              lineHeight: 1,
              textTransform: "uppercase",
              color: "#f5f5f7",
              textShadow: "0 8px 40px rgba(255,46,46,0.45)",
            }}
          >
            ROUNDS
          </div>
          <div
            style={{
              fontSize: 30,
              letterSpacing: 10,
              color: "#f2b53c",
              textTransform: "uppercase",
              marginTop: 28,
            }}
          >
            {copy.sub}
          </div>
          <div
            style={{
              fontSize: 18,
              letterSpacing: 4,
              color: "#a2a2b3",
              textTransform: "uppercase",
              marginTop: 40,
            }}
          >
            {copy.meta}
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
