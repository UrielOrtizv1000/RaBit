/**
 * Ajusta cada página al área disponible SIN scroll.
 *
 * Cómo: busca (búsqueda binaria) la mayor escala `z` tal que, con ancho = disponible/z, el alto natural × z quepa.
 * La escala base depende de la ventana (1600×980 = 1.0) y es común a todas las páginas, para que paddings y
 * tipografías se vean iguales en todas; solo se reduce más si el contenido no cabe.
 *
 * Notas de diseño:
 * - Se mide con `height:auto` primero; si no, la altura fijada por la pasada anterior falsea la medición.
 * - Se omite el reajuste durante un gesto de arrastre (`data-swiping`) para evitar vibraciones.
 * - `overflow: clip` + `overflow-clip-margin` deja espacio a las sombras (con `hidden` se cortaban en los bordes).
 * - Las mediciones con getBoundingClientRect salen en px visuales: usa `scaleOf()` de lib/zoom para convertirlas.
 */
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { setZoom } from "../lib/zoom";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5; // en ventanas amplias la interfaz crece un poco (texto más legible)
const PAD_BOTTOM = 58; // zona segura inferior (la de Routine: las tarjetas terminan aquí)
/** Escala común a TODAS las páginas según el tamaño de la ventana (1600×980 = 1.0): así el padding se ve igual en todas. */
const baseZoom = (): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(window.innerWidth / 1600, window.innerHeight / 980)));

/**
 * Hace que la página quepa SIEMPRE en el área disponible, sin scroll:
 * busca la mayor escala z ≤ 1 tal que, con el ancho disponible/z, el alto natural × z ≤ alto disponible.
 * Se recalcula al redimensionar la ventana y cuando cambia el contenido.
 */
export function FitPage({ children, pageKey }: { children: ReactNode; pageKey: string }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const b = box.current,
      el = inner.current;
    if (!b || !el) return;
    let raf = 0;

    const fit = () => {
      if (document.documentElement.dataset.swiping) return; // sin reajustes mientras se arrastra una tarjeta
      const w = b.clientWidth,
        h = b.clientHeight - PAD_BOTTOM;
      if (!w || !h) return;
      el.style.height = "auto"; // medir el alto natural, no el que dejó la pasada anterior
      const natural = (z: number) => {
        el.style.width = `${w / z}px`;
        el.style.paddingRight = `${26 / z}px`;
        return el.scrollHeight * z;
      };
      const zMax = baseZoom();
      let z = zMax;
      if (natural(zMax) > h - 1) {
        let lo = MIN_ZOOM,
          hi = zMax;
        for (let i = 0; i < 9; i++) {
          const mid = (lo + hi) / 2;
          if (natural(mid) <= h - 1) lo = mid;
          else hi = mid;
        }
        z = lo;
      }
      el.style.width = `${w / z}px`;
      el.style.transform = `scale(${z})`;
      el.style.height = `${h / z}px`;
      el.style.paddingRight = `${26 / z}px`; // margen derecho constante en px reales (26), sea cual sea la escala
      setZoom(z);
      // si ni al mínimo cabe, permitir scroll como último recurso
      b.style.overflow = z <= MIN_ZOOM + 0.001 && el.scrollHeight * z > h + 6 ? "auto" : "clip";
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };

    fit();
    const ro = new ResizeObserver(schedule);
    ro.observe(b);
    // contenido que crece o se encoge (listas, modales de página, etc.)
    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", schedule);
    void document.fonts?.ready.then(schedule);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", schedule);
      setZoom(1);
    };
  }, [pageKey]);

  return (
    <div
      ref={box}
      className="rb-noscroll"
      style={{ position: "relative", flex: 1, minWidth: 0, minHeight: 0, overflow: "clip", overflowClipMargin: 64, padding: `0 0 ${PAD_BOTTOM}px 0` }}
    >
      <div ref={inner} style={{ transformOrigin: "top left", padding: "10px 26px 0 0", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}
