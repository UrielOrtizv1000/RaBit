import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ES: Record<string, string> = {};
const mods = import.meta.glob<{ es: Record<string, string> }>("../src/i18n/es/*.ts", { eager: true });
for (const m of Object.values(mods)) Object.assign(ES, m.es);

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f !== "i18n") walk(p, out);
    } else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

/** Texto literal de cada t("…") / tn(n, "…", "…") del código. */
function keysIn(src: string): string[] {
  const keys: string[] = [];
  const str = String.raw`("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')`;
  for (const m of src.matchAll(new RegExp(String.raw`(?<![\w.])t\(\s*${str}`, "g")))
    keys.push(JSON.parse(m[1].startsWith("'") ? `"${m[1].slice(1, -1).replace(/"/g, '\\"')}"` : m[1]));
  for (const m of src.matchAll(new RegExp(String.raw`(?<![\w.])tn\(\s*[^,]+,\s*${str}\s*,\s*${str}`, "g"))) {
    for (const g of [m[1], m[2]]) keys.push(JSON.parse(g.startsWith("'") ? `"${g.slice(1, -1).replace(/"/g, '\\"')}"` : g));
  }
  return keys;
}

describe("i18n", () => {
  const files = walk("src");
  const missing: string[] = [];
  for (const f of files) for (const k of keysIn(readFileSync(f, "utf8"))) if (!(k in ES)) missing.push(`${f}: ${k}`);

  it("every t('…') in the source has a Spanish translation", () => {
    expect([...new Set(missing)]).toEqual([]);
  });

  it("placeholders {x} are preserved in translations", () => {
    const bad = Object.entries(ES)
      .filter(([k, v]) => {
        const a = (k.match(/\{\w+\}/g) ?? []).sort().join(),
          b = (v.match(/\{\w+\}/g) ?? []).sort().join();
        return a !== b;
      })
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });
});
