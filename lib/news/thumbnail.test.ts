import { describe, expect, it } from "vitest";
import { thumbHash, thumbUrl } from "./thumbnail";
import type { NewsItem } from "./types";

const article: NewsItem = {
  type: "article",
  id: "https://example.com/a",
  title: "Canelo signs new deal",
  url: "https://example.com/a",
  source: "Bad Left Hook",
  sourceId: "badlefthook",
  publishedAt: "2026-08-13T10:00:00.000Z",
};

describe("thumbnail — hash & url", () => {
  it("hash stable pour le même couple sourceId:titre", () => {
    expect(thumbHash({ sourceId: "badlefthook", title: "Canelo signs new deal" })).toBe(
      thumbHash({ sourceId: "badlefthook", title: "Canelo signs new deal" })
    );
  });

  it("hash différent si le titre change", () => {
    expect(thumbHash({ sourceId: "badlefthook", title: "Canelo signs new deal" })).not.toBe(
      thumbHash({ sourceId: "badlefthook", title: "Crawford signs new deal" })
    );
  });

  it("hash en 16 hex", () => {
    expect(thumbHash({ sourceId: "badlefthook", title: "x" })).toMatch(/^[0-9a-f]{16}$/);
  });

  it("thumbUrl pointe vers la route avec url/title/source encodés", () => {
    const url = thumbUrl(article);
    expect(url).toMatch(/^\/api\/news\/thumb\/[0-9a-f]{16}\?/);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("url")).toBe(article.url);
    expect(params.get("title")).toBe(article.title);
    expect(params.get("source")).toBe("badlefthook");
  });

  it("thumbUrl inclut la description quand présente (tronquée)", () => {
    const withDesc = { ...article, description: "d".repeat(500) };
    const url = thumbUrl(withDesc);
    expect(url).toContain("desc=");
    expect(url.length).toBeLessThan(1200); // tronquée à 300 caractères
  });
});
