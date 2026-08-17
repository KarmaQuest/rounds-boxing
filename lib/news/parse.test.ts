import { describe, expect, it } from "vitest";
import { decodeEntities, parseArticleFeed, parseVideoFeed, stripHtml } from "./parse";
import type { ArticleSource, VideoSource } from "./sources";

const RSS_SOURCE: ArticleSource = {
  id: "wbn",
  name: "World Boxing News",
  url: "https://x/feed/",
  atom: false,
};

const ATOM_SOURCE: ArticleSource = {
  id: "badlefthook",
  name: "Bad Left Hook",
  url: "https://x/rss/index.xml",
  atom: true,
};

const VIDEO_SOURCE: VideoSource = {
  id: "dazn",
  name: "DAZN Boxing",
  channelId: "UC123",
};

const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>WBN</title>
    <item>
      <title>Usyk remporte la revanche</title>
      <link>https://example.com/usyk-revanche</link>
      <pubDate>Wed, 14 Aug 2026 20:30:00 GMT</pubDate>
      <description>&lt;p&gt;Le champion ukrainien s&amp;#39;impose au 9e round.&lt;/p&gt;</description>
    </item>
    <item>
      <title>Sans lien</title>
      <description>pas de lien, on doit l'ignorer</description>
    </item>
  </channel>
</rss>`;

const ATOM_XML = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Bad Left Hook</title>
  <entry>
    <title>Canelo signs new deal</title>
    <link href="https://example.com/canelo-deal" />
    <published>2026-08-13T10:00:00Z</published>
    <summary type="html">&lt;b&gt;Breaking:&lt;/b&gt; Canelo a signé.</summary>
  </entry>
  <entry>
    <title>Invalide (pas de lien)</title>
    <published>2026-08-12T10:00:00Z</published>
  </entry>
</feed>`;

// Titre/description avec entités numériques (flux WordPress : les
// guillemets typographiques sont encodés en &amp;#8216; etc. dans le XML)
const ENTITIES_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>WBN</title>
    <item>
      <title>Canelo : &amp;#8220;je suis le meilleur&amp;#8221; dit-il</title>
      <link>https://example.com/canelo-quote</link>
      <pubDate>Wed, 13 Aug 2026 20:30:00 GMT</pubDate>
      <description>&lt;p&gt;Il vise &amp;#8216;le sommet&amp;#8217; &amp;amp; le titre WBC.&lt;/p&gt;</description>
    </item>
  </channel>
</rss>`;

const YT_XML = `<?xml version="1.0"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
  <entry>
    <id>yt:video:abc123</id>
    <yt:videoId>abc123</yt:videoId>
    <title>Fight Highlights</title>
    <published>2026-08-15T09:00:00+00:00</published>
    <media:group>
      <media:thumbnail url="https://i.ytimg.com/vi/abc123/hqdefault.jpg" />
      <media:description>Best moments of the night</media:description>
    </media:group>
    <author><name>DAZN Boxing</name></author>
  </entry>
  <entry>
    <id>yt:video:def456</id>
    <yt:videoId>def456</yt:videoId>
    <title>Press Conference</title>
    <published>2026-08-14T18:00:00+00:00</published>
  </entry>
</feed>`;

describe("parseArticleFeed — RSS 2.0", () => {
  it("extrait titre, lien, date et description nettoyée", () => {
    const items = parseArticleFeed(RSS_XML, RSS_SOURCE);
    expect(items).toHaveLength(1);

    const [item] = items;
    expect(item.type).toBe("article");
    expect(item.title).toBe("Usyk remporte la revanche");
    expect(item.url).toBe("https://example.com/usyk-revanche");
    expect(item.source).toBe("World Boxing News");
    expect(item.publishedAt).toBe(new Date("2026-08-14T20:30:00Z").toISOString());
    expect(item.description).toContain("Le champion ukrainien");
    expect(item.description).not.toContain("<p>");
  });

  it("ignore les items sans lien", () => {
    expect(parseArticleFeed(RSS_XML, RSS_SOURCE)).toHaveLength(1);
  });
});

describe("parseArticleFeed — Atom", () => {
  it("extrait le lien depuis l'attribut href", () => {
    const items = parseArticleFeed(ATOM_XML, ATOM_SOURCE);
    expect(items).toHaveLength(1);

    const [item] = items;
    expect(item.title).toBe("Canelo signs new deal");
    expect(item.url).toBe("https://example.com/canelo-deal");
    expect(item.source).toBe("Bad Left Hook");
    expect(item.publishedAt).toBe("2026-08-13T10:00:00.000Z");
    expect(item.description).toContain("Breaking:");
  });
});

describe("parseVideoFeed — YouTube videos.xml", () => {
  it("construit l'URL de lecture et la miniature", () => {
    const items = parseVideoFeed(YT_XML, VIDEO_SOURCE);
    expect(items).toHaveLength(2);

    const [first] = items;
    expect(first.type).toBe("video");
    expect(first.id).toBe("abc123");
    expect(first.url).toBe("https://www.youtube.com/watch?v=abc123");
    expect(first.thumbnail).toBe("https://i.ytimg.com/vi/abc123/hqdefault.jpg");
    expect(first.source).toBe("DAZN Boxing");
  });

  it("gère les entrées sans miniature (fallback i.ytimg.com)", () => {
    const items = parseVideoFeed(YT_XML, VIDEO_SOURCE);
    expect(items[1]!.thumbnail).toBe("https://i.ytimg.com/vi/def456/hqdefault.jpg");
  });

  it("trie-t-il ? non — l'agrégateur trie, le parser préserve l'ordre", () => {
    const items = parseVideoFeed(YT_XML, VIDEO_SOURCE);
    expect(items[0]!.id).toBe("abc123");
  });
});

describe("parseArticleFeed — entités HTML", () => {
  it("décode les entités numériques des titres et descriptions", () => {
    const items = parseArticleFeed(ENTITIES_XML, RSS_SOURCE);
    expect(items).toHaveLength(1);

    const [item] = items;
    expect(item.title).toBe("Canelo : \u201cje suis le meilleur\u201d dit-il");
    expect(item.title).not.toContain("&#");
    expect(item.title).not.toContain("&amp;");
    expect(item.description).toBe("Il vise \u2018le sommet\u2019 & le titre WBC.");
    expect(item.description).not.toContain("&#");
  });
});

describe("parseArticleFeed — XML invalide", () => {
  it("retourne [] sans lever", () => {
    expect(parseArticleFeed("<rss><channel>", RSS_SOURCE)).toEqual([]);
    expect(parseArticleFeed("pas du xml", RSS_SOURCE)).toEqual([]);
    expect(parseVideoFeed("", VIDEO_SOURCE)).toEqual([]);
  });
});

describe("stripHtml", () => {
  it("retire balises et entités", () => {
    expect(stripHtml("<p>Bonjour &amp; bienvenue</p>")).toBe("Bonjour & bienvenue");
    expect(stripHtml("a &lt; b &gt; c &#39;d&#39; &quot;e&quot;")).toBe("a < b > c 'd' \"e\"");
  });

  it("décode les guillemets typographiques (&#8216; etc.)", () => {
    expect(stripHtml("&#8220;je suis le meilleur&#8221;")).toBe("\u201cje suis le meilleur\u201d");
    expect(stripHtml("&#x2018;ok&#x2019;")).toBe("\u2018ok\u2019");
    expect(stripHtml("R&amp;D &amp; plus")).toBe("R&D & plus");
    // double encodage : &amp;amp; représente littéralement « &amp; »
    expect(stripHtml("&amp;amp;")).toBe("&amp;");
  });
});

describe("decodeEntities", () => {
  it("décode numérique décimal, hex et nommé", () => {
    expect(decodeEntities("&#8216;a&#8217; &amp; &#x201C;b&#x201D;")).toBe("\u2018a\u2019 & \u201Cb\u201D");
    expect(decodeEntities("rien à décoder")).toBe("rien à décoder");
  });

  it("laisse les références invalides intactes", () => {
    expect(decodeEntities("&#99999999999;")).toBe("&#99999999999;");
    expect(decodeEntities("&#;")).toBe("&#;");
  });
});
