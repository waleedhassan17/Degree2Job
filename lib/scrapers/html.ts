// Shared HTML helpers for every scraper.
//
// Previously each scraper carried its own `stripHtml` that replaced numeric
// entities (e.g. `&#39;`) with a *space* and left named entities like `&amp;`
// untouched — so job titles/descriptions showed raw "&amp;" and apostrophes
// turned into gaps ("3 years  experience"). These helpers decode entities
// correctly instead, which is the single biggest accuracy fix across sources.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  sbquo: "‚",
  ldquo: "“",
  rdquo: "”",
  bdquo: "„",
  hellip: "…",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  deg: "°",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  euro: "€",
  pound: "£",
  cent: "¢",
  times: "×",
  divide: "÷",
};

/**
 * Decode HTML entities to their real characters: named (`&amp;`, `&rsquo;`),
 * decimal (`&#39;`) and hex (`&#x2B;`). Unknown entities are left as-is.
 */
export function decodeEntities(input?: string): string {
  if (!input) return "";
  return input.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (Number.isFinite(code) && code > 0) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return match;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? match;
  });
}

/**
 * Strip HTML tags, decode entities, and collapse whitespace into a single
 * clean line of text. Safe to call on already-plain strings.
 */
export function stripHtml(html?: string): string {
  if (!html) return "";
  return decodeEntities(
    html
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Clean a job title: strip tags/entities and drop the boilerplate location
 * suffix some feeds append (e.g. Mustakbil's "… Jobs in Karachi, Pakistan").
 */
export function cleanTitle(raw?: string): string {
  const text = stripHtml(raw);
  // Mustakbil appends a "… Jobs in {City}, {Country}" suffix to every title.
  // Strip a trailing "Jobs in <Capitalised location>[, <Country>]" so titles
  // read like real job titles ("Mechanical CAD Engineer", not "… Jobs in Oslo,
  // Norway"). Anchored to the end and gated on a capitalised location so it
  // never eats a genuine mid-title phrase.
  const cleaned = text.replace(
    /\s+Jobs?\s+in\s+[A-Z][^,]*(?:,\s*[A-Za-z][^,]*)?\.?$/,
    ""
  );
  return (cleaned || text).trim();
}
