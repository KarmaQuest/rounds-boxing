import { describe, expect, it } from "vitest";
import { proxyImageUrl } from "./img-proxy";

describe("proxyImageUrl", () => {
  it("réécrit les vignettes World Boxing News vers /api/img", () => {
    const url =
      "https://www.worldboxingnews.com/wp-content/uploads/2026/08/terrel-williams.jpg";
    expect(proxyImageUrl(url)).toBe(
      `/api/img?url=${encodeURIComponent(url)}`
    );
  });

  it("laisse passer les autres hôtes (YouTube, cdn des sites)", () => {
    expect(proxyImageUrl("https://i.ytimg.com/vi/abc/hqdefault.jpg")).toBe(
      "https://i.ytimg.com/vi/abc/hqdefault.jpg"
    );
    expect(
      proxyImageUrl(
        "https://cdn-img.boxingnewsonline.net/uploads/content/1.jpg"
      )
    ).toBe("https://cdn-img.boxingnewsonline.net/uploads/content/1.jpg");
    expect(
      proxyImageUrl("https://platform.badlefthook.com/wp-content/uploads/x.jpg")
    ).toBe("https://platform.badlefthook.com/wp-content/uploads/x.jpg");
  });

  it("laisse intactes les URLs invalides", () => {
    expect(proxyImageUrl("pas une url")).toBe("pas une url");
  });
});
