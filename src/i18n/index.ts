/**
 * i18n mínimo. Las claves SON el texto en inglés: t("Today") devuelve "Hoy" si el idioma es español.
 * Los diccionarios viven en src/i18n/es/*.ts (cada archivo exporta `es: Record<string, string>`).
 * Soporta interpolación: t("Hello, {name}", { name }) → "Hola, Ana".
 */
export type Lang = "en" | "es";
export const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
];

const modules = import.meta.glob<{ es: Record<string, string> }>("./es/*.ts", { eager: true });
const ES: Record<string, string> = {};
for (const m of Object.values(modules)) Object.assign(ES, m.es);

let current: Lang = "en";
const listeners = new Set<(l: Lang) => void>();

export const getLang = (): Lang => current;
export function setLang(l: Lang): void {
  if (l === current) return;
  current = l;
  listeners.forEach((cb) => cb(l));
}
export const onLang = (cb: (l: Lang) => void): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Idioma por defecto: el del sistema si es español, inglés en cualquier otro caso. */
export const systemLang = (): Lang => (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("es") ? "es" : "en");

export function t(text: string, vars?: Record<string, string | number>): string {
  let out = current === "es" ? (ES[text] ?? text) : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Plural simple: tn(2, "event", "events") → "events" / "eventos". */
export function tn(n: number, one: string, other: string): string {
  return `${n} ${t(n === 1 ? one : other)}`;
}

/** Palabras que faltan en el diccionario (solo desarrollo): útil para auditar traducciones. */
export const hasEs = (text: string): boolean => text in ES;
