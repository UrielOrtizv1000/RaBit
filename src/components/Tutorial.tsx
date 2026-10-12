/**
 * Tutorial guiado (principal y por página/ventana, ver tours.ts): la tarjeta aparece al centro y, con cada «Siguiente», se desliza hasta la
 * herramienta que explica mientras un aro verde la resalta (el resto de la pantalla se atenúa un poco).
 * No bloquea la app (pointer-events: none salvo la tarjeta). Cada uno se muestra una vez (marca en localStorage,
 * ver tourState.ts) y se pueden repetir desde Ajustes.
 *
 * Los objetivos se marcan en la interfaz con `data-tour="…"`; si un objetivo no existe (módulo apagado,
 * otra página) la tarjeta simplemente se queda al centro.
 */
import { useLayoutEffect, useRef, useState } from "react";
import { useUi } from "../store/ui";
import { silk } from "./ui/glass";
import { t } from "../i18n";
import { markTourSeen } from "./tourState";
import { TOURS, type TourId } from "./tours";

const CARD_W = 340;
const MARGIN = 16;
const PAD = 6; // aire entre el objetivo y el aro
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Monta el tutorial abierto (si hay); `key` reinicia el paso al cambiar de tutorial. */
export function Tutorial() {
  const tour = useUi((s) => s.tour);
  return tour ? <TourView key={tour} id={tour} /> : null;
}

function TourView({ id }: { id: TourId }) {
  const STEPS = TOURS[id];
  const openTour = useUi((s) => s.openTour);
  const setPage = useUi((s) => s.setPage);
  const open = true;
  const [i, setI] = useState(0);
  const [target, setTarget] = useState<Rect | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [cardH, setCardH] = useState(190);
  const [armed, setArmed] = useState(false); // las transiciones se activan tras la primera medición (la tarjeta no «viaja» al abrir)
  const wrap = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const key = STEPS[i].target;

  // El tutorial principal empieza en Home, donde están los botones de crear.
  useLayoutEffect(() => {
    if (id === "main") setPage("home");
  }, [id, setPage]);

  // Mide el objetivo respecto a la capa del tutorial; se re-mide por si la interfaz se reescala o se mueve.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const w = wrap.current;
      if (!w) return;
      const base = w.getBoundingClientRect();
      setArea((a) => (a.w === base.width && a.h === base.height ? a : { w: base.width, h: base.height }));
      setCardH((h) => card.current?.offsetHeight ?? h);
      const el = key ? document.querySelector<HTMLElement>(`[data-tour="${key}"]`) : null;
      const r = el?.getBoundingClientRect();
      if (!r || !r.width || !r.height) return setTarget(null);
      const next = { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
      setTarget((p) => (p && p.x === next.x && p.y === next.y && p.w === next.w && p.h === next.h ? p : next));
    };
    measure();
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setArmed(true)));
    const id = setInterval(measure, 250);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
      window.removeEventListener("resize", measure);
    };
  }, [open, key, i]);

  const last = i === STEPS.length - 1;
  const close = () => {
    markTourSeen(id);
    openTour(null);
    setI(0);
    setTarget(null);
    setArmed(false);
  };
  const s = STEPS[i];

  // ---- posición de la tarjeta: junto al objetivo (a la derecha si está en el borde izquierdo, si no debajo/arriba) o al centro
  const maxLeft = Math.max(MARGIN, area.w - CARD_W - MARGIN);
  const maxTop = Math.max(MARGIN, area.h - cardH - MARGIN);
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  let left = (area.w - CARD_W) / 2;
  let top = (area.h - cardH) / 2;
  if (target) {
    const cx = target.x + target.w / 2;
    const cy = target.y + target.h / 2;
    if (target.x + target.w < 200 && target.y > area.h * 0.2) {
      left = target.x + target.w + PAD + 22;
      top = clamp(cy - cardH / 2, MARGIN, maxTop);
    } else {
      left = clamp(cx - CARD_W / 2, MARGIN, maxLeft);
      const below = target.y + target.h + PAD + 18;
      top = below + cardH <= area.h - MARGIN ? below : clamp(target.y - PAD - 18 - cardH, MARGIN, maxTop);
    }
  }
  left = clamp(left, MARGIN, maxLeft);
  top = clamp(top, MARGIN, maxTop);

  // ---- aro: sobre el objetivo; sin objetivo se contrae al centro (solo queda la atenuación)
  const ring = target ? { x: target.x - PAD, y: target.y - PAD, w: target.w + PAD * 2, h: target.h + PAD * 2 } : { x: area.w / 2, y: area.h / 2, w: 0, h: 0 };
  const radius = target ? Math.min(ring.h / 2, 22) : 0;
  const ease = "cubic-bezier(.2,.8,.2,1)";
  const glide = `left .55s ${ease},top .55s ${ease}`;
  const btn = {
    border: 0,
    borderRadius: 999,
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    padding: "8px 14px",
    flex: "none",
    whiteSpace: "nowrap",
  } as const;

  return (
    <div ref={wrap} style={{ position: "absolute", inset: 0, zIndex: 70, pointerEvents: "none" }}>
      <div
        aria-hidden="true"
        className={target ? "rb-tour-ring" : undefined}
        style={{
          position: "absolute",
          left: ring.x,
          top: ring.y,
          width: ring.w,
          height: ring.h,
          borderRadius: radius,
          boxShadow: `0 0 0 9999px rgba(10,24,18,.34)${target ? ",0 0 0 2.5px #3ddc84,0 0 22px 4px rgba(61,220,132,.55)" : ""}`,
          transition: !armed ? "none" : `${glide},width .55s ${ease},height .55s ${ease},border-radius .55s ease`,
        }}
      />
      <style>{`@keyframes rb-tour-pulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}.rb-tour-ring{animation:rb-tour-pulse 1.8s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.rb-tour-ring{animation:none}}`}</style>
      <div
        ref={card}
        role="dialog"
        aria-label={t("Tutorial")}
        style={{
          position: "absolute",
          left,
          top,
          width: CARD_W,
          boxSizing: "border-box",
          pointerEvents: "auto",
          padding: "18px 20px 16px",
          borderRadius: 24,
          background: "linear-gradient(150deg,#ffffff,#f5faf7)",
          border: "1px solid rgba(255,255,255,.9)",
          boxShadow: "inset 0 1px 1px #fff,0 30px 60px -24px rgba(12,40,26,.55)",
          transition: armed ? glide : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={silk(9, { letterSpacing: ".14em", color: "#0b7a45" })}>{t("TUTORIAL")}</div>
          <div style={silk(9, { letterSpacing: ".1em", color: "#6b7a73" })}>
            {i + 1}/{STEPS.length}
          </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#121a16", marginBottom: 6 }}>{t(s.title)}</div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "#41504a" }}>{t(s.body)}</div>
        <div style={{ display: "flex", gap: 4, marginTop: 14 }}>
          {STEPS.map((_, n) => (
            <div
              key={n}
              style={{ width: n === i ? 14 : 5, height: 5, borderRadius: 3, background: n === i ? "#17b866" : "rgba(18,38,30,.15)", transition: "width .2s ease-out" }}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 12 }}>
          {!last && (
            <button onClick={close} style={{ ...btn, background: "transparent", color: "#5d6f67" }}>
              {t("Skip")}
            </button>
          )}
          {i > 0 && (
            <button onClick={() => setI(i - 1)} style={{ ...btn, background: "rgba(18,38,30,.06)", color: "#41504a" }}>
              {t("Back")}
            </button>
          )}
          <button onClick={() => (last ? close() : setI(i + 1))} style={{ ...btn, color: "#fff", background: "linear-gradient(150deg,#1fc172,#0f9a56)" }}>
            {last ? t("Got it") : t("Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
