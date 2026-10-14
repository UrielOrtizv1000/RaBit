/**
 * Mensaje de «acabas de actualizar» para la terminal de Home: escribe `UPDATED TO v1.3.0` y una línea del «What's new»
 * con efecto de máquina de escribir, la deja unos segundos y se quita (la terminal vuelve a su texto normal).
 */
import { useEffect, useState } from "react";
import { useUpdater } from "../services/updater";
import { t } from "../i18n";

const TYPE_MS = 45;
const HOLD_MS = 9000;

export interface UpdatedLines {
  greeting: string;
  line: string;
}

export function useUpdatedNotice(): UpdatedLines | null {
  const updated = useUpdater((s) => s.updated);
  const [n, setN] = useState(0);
  const greeting = updated ? t("UPDATED TO v{version}", { version: updated.version }) : "";
  const line = updated ? (updated.notes[0] ?? t("ENJOY THE NEW VERSION.")).toUpperCase().slice(0, 60) : "";
  const total = greeting.length + line.length;
  const reduce = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!updated) return;
    let hold: ReturnType<typeof setTimeout> | undefined;
    const done = () => {
      hold = setTimeout(() => useUpdater.api.dismissUpdated(), HOLD_MS);
    };
    // Con movimiento reducido el texto se muestra completo (ver `shown`) y solo se espera para quitarlo.
    if (reduce) {
      done();
      return () => clearTimeout(hold);
    }
    const timer = setInterval(() => {
      setN((c) => {
        if (c + 1 >= total) {
          clearInterval(timer);
          done();
        }
        return c + 1;
      });
    }, TYPE_MS);
    return () => {
      setN(0);
      clearInterval(timer);
      clearTimeout(hold);
    };
  }, [updated, total, reduce]);

  if (!updated) return null;
  const shown = reduce ? total : n;
  return { greeting: greeting.slice(0, shown), line: line.slice(0, Math.max(0, shown - greeting.length)) };
}
