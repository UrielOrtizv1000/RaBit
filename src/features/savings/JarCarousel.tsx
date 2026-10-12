/**
 * Carrusel de frascos: se arrastra con el mouse/dedo desde cualquier punto (con inercia y resorte), tiene flechas y
 * puntos, y al reordenarse las tarjetas se deslizan a su nuevo sitio (FLIP). Mientras se mueve publica su aceleración
 * en `sway` para que los frascos se balanceen y las monedas se sacudan.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { lighten, money, perOf, shortDate, type GoalPlan, type SavingsGoal, coinsFor } from "../../domain/savings";
import { getZoom } from "../../lib/zoom";
import { t } from "../../i18n";
import { Jar, type Sway } from "./Jar";

export interface JarCard {
  goal: SavingsGoal;
  plan: GoalPlan;
  msg: string;
  sub: string;
  msgColor: string;
}

const GAP = 16;
const LIFT_AT = 90; // px arrastrados hacia arriba para armar el borrado
const VISIBLE = 3;
const ease = "cubic-bezier(.22,1,.36,1)";
const navBtn = {
  width: 36,
  height: 36,
  padding: 0,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  color: "#41504a",
  background: "linear-gradient(145deg,rgba(255,255,255,.72),rgba(255,255,255,.38))",
  backdropFilter: "blur(24px) saturate(170%)",
  border: "1px solid rgba(255,255,255,.8)",
  boxShadow: "inset 0 1px 1px #fff,0 10px 20px -14px rgba(20,48,34,.4)",
  transition: `opacity .3s ease,transform .3s ${ease}`,
} as const;

export function JarCarousel({
  cards,
  dropId,
  followId,
  sparks,
  reduced,
  onAdd,
  onWithdraw,
  onEdit,
  onNew,
  onDelete,
}: {
  cards: JarCard[];
  dropId: string | null;
  followId: string | null;
  sparks: Record<string, number>;
  reduced: boolean;
  onAdd: (id: string) => void;
  onWithdraw: (id: string) => void;
  onEdit: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const sway = useRef<Sway>({ acc: 0 });
  const ph = useRef({ x: 0, v: 0, lx: 0, lv: 0, acc: 0, drag: false, down: false, slide: 0, sx: 0, sy: 0, x0: 0, moved: 0, pid: 0 });
  // Frasco levantado para borrarlo: mantener presionado y arrastrar hacia arriba
  const lf = useRef<{ active: boolean; id: string; el: HTMLElement | null; y0: number; armed: boolean }>({ active: false, id: "", el: null, y0: 0, armed: false });
  const [lift, setLift] = useState<{ id: string; armed: boolean } | null>(null);
  const [slide, setSlide] = useState(0);
  const [dragging, setDragging] = useState(false);
  const lefts = useRef<Map<string, number>>(new Map());
  const max = Math.max(0, cards.length + 1 - VISIBLE);
  const maxRef = useRef(max);
  useEffect(() => {
    maxRef.current = max;
  }, [max]);

  const step = useCallback(() => {
    const w = wrap.current;
    return w ? (w.clientWidth - 12 - GAP * (VISIBLE - 1)) / VISIBLE + GAP : 300;
  }, []);

  const go = useCallback((i: number) => {
    const p = ph.current;
    p.slide = Math.max(0, Math.min(maxRef.current, i));
    setSlide(p.slide);
  }, []);

  // si desaparecen frascos, el carrusel no se queda mirando al vacío
  useEffect(() => {
    if (ph.current.slide > max) go(max);
  }, [max, go]);

  // resorte hacia el frasco actual + aceleración (para sacudir los frascos)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = ph.current;
      const T = track.current;
      if (T) {
        const tx = -p.slide * step();
        if (reduced) {
          p.x = tx;
          p.v = 0;
        } else if (!p.drag) {
          p.v += (tx - p.x) * 0.075;
          p.v *= 0.8;
          p.x += p.v;
          if (Math.abs(tx - p.x) < 0.05 && Math.abs(p.v) < 0.05) {
            p.x = tx;
            p.v = 0;
          }
        }
        const vel = p.x - p.lx;
        p.lx = p.x;
        const acc = vel - p.lv;
        p.lv = vel;
        p.acc = p.acc * 0.55 + Math.max(-12, Math.min(12, acc)) * 0.45;
        sway.current.acc = p.acc;
        T.style.transform = `translate3d(${p.x.toFixed(2)}px,0,0)`;
        if (p.drag) p.v *= 0.6;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, reduced]);

  // Reordenar: cada tarjeta se desliza desde donde estaba; la que acaba de completarse da un saltito
  useLayoutEffect(() => {
    const T = track.current;
    if (!T) return;
    const prev = lefts.current;
    const next = new Map<string, number>();
    let moved = false;
    T.querySelectorAll<HTMLElement>("[data-card]").forEach((el) => {
      const id = el.dataset.card ?? "";
      const left = el.offsetLeft;
      next.set(id, left);
      const was = prev.get(id);
      if (prev.size === 0 || reduced || !el.animate) return;
      if (was === undefined) {
        if (id === dropId)
          el.animate(
            [
              { opacity: 0, transform: "translateY(26px) scale(.92)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 750, easing: ease },
          );
        return;
      }
      const dx = was - left;
      if (Math.abs(dx) < 2) return;
      moved = true;
      const hero = id === followId;
      el.style.position = "relative";
      el.style.zIndex = hero ? "3" : "1";
      const frames = hero
        ? [
            { transform: `translateX(${dx}px)` },
            { transform: `translateX(${dx * 0.55}px) translateY(-18px) scale(1.04)`, offset: 0.45 },
            { transform: "translateY(-6px) scale(1.01)", offset: 0.85 },
            { transform: "none" },
          ]
        : [{ transform: `translateX(${dx}px)` }, { transform: "none" }];
      const an = el.animate(frames, { duration: hero ? 1500 : 1300, delay: hero ? 0 : 80, easing: "cubic-bezier(.45,.05,.25,1)", fill: "backwards" });
      an.onfinish = () => {
        el.style.zIndex = "";
      };
    });
    lefts.current = next;
    if (followId && moved) {
      const idx = cards.findIndex((c) => c.goal.id === followId);
      if (idx >= 0) setTimeout(() => go(idx - 1), 120);
    }
  });

  // frasco nuevo: llévalo a la vista
  useEffect(() => {
    if (!dropId) return;
    const id = setTimeout(() => {
      const idx = cards.findIndex((c) => c.goal.id === dropId);
      if (idx >= 0) go(idx - 1);
    }, 30);
    return () => clearTimeout(id);
  }, [dropId, cards, go]);

  const p = ph.current;
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    p.down = true;
    p.drag = false;
    p.moved = 0;
    p.sx = e.clientX;
    p.sy = e.clientY;
    p.x0 = p.x;
    p.pid = e.pointerId;
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!p.down) return;
    const z = getZoom() || 1;
    const L = lf.current;
    if (L.active) {
      const dy = Math.min(0, (e.clientY - L.y0) / z);
      const armed = dy < -LIFT_AT;
      L.el?.style.setProperty("transform", `translateY(${dy.toFixed(1)}px) scale(${(1 + Math.min(0.04, -dy / 4000)).toFixed(3)})`);
      L.el?.style.setProperty("opacity", String(Math.max(0.55, 1 + dy / 420)));
      if (armed !== L.armed) {
        L.armed = armed;
        if (L.el) L.el.dataset.armed = armed ? "1" : "";
        setLift({ id: L.id, armed });
      }
      p.moved = 99;
      return;
    }
    if (!p.drag) {
      const dx = e.clientX - p.sx;
      const dy = e.clientY - p.sy;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      const card = (e.target as Element).closest<HTMLElement>("[data-card]");
      if (card && dy < 0 && -dy > Math.abs(dx) * 1.2) {
        // gesto vertical hacia arriba sobre un frasco: se levanta para borrarlo
        L.active = true;
        L.id = card.dataset.card ?? "";
        L.el = card;
        L.y0 = e.clientY;
        L.armed = false;
        card.style.transition = "none";
        card.style.position = "relative";
        card.style.zIndex = "6";
        try {
          e.currentTarget.setPointerCapture(p.pid);
        } catch {
          /* el puntero ya terminó */
        }
        setLift({ id: L.id, armed: false });
        p.moved = 99;
        return;
      }
      if (Math.abs(dx) < 6) return;
      p.drag = true;
      p.x0 = p.x;
      p.sx = e.clientX;
      p.v = 0;
      try {
        e.currentTarget.setPointerCapture(p.pid);
      } catch {
        /* el puntero ya terminó */
      }
      setDragging(true);
    }
    const minX = -maxRef.current * step();
    let nx = p.x0 + (e.clientX - p.sx) / z;
    if (nx > 0) nx *= 0.35;
    if (nx < minX) nx = minX + (nx - minX) * 0.35;
    p.v = nx - p.x;
    p.x = nx;
    p.moved = Math.max(p.moved, 7, Math.abs(e.clientX - p.sx));
  };
  const onUp = () => {
    p.down = false;
    const L = lf.current;
    if (L.active) {
      const el = L.el;
      const id = L.id;
      const armed = L.armed;
      L.active = false;
      L.el = null;
      L.armed = false;
      setLift(null);
      if (el) {
        el.style.transition = armed ? "transform .28s cubic-bezier(.5,0,.9,.4),opacity .28s ease" : "transform .5s cubic-bezier(.22,1,.36,1),opacity .3s ease";
        el.style.transform = armed ? "translateY(-260px) scale(.9)" : "none";
        el.style.opacity = armed ? "0" : "1";
        el.dataset.armed = "";
        setTimeout(
          () => {
            el.style.transition = "";
            el.style.zIndex = "";
            if (armed) onDelete(id);
            else {
              el.style.transform = "";
              el.style.opacity = "";
            }
          },
          armed ? 260 : 520,
        );
      }
      return;
    }
    if (!p.drag) return;
    p.drag = false;
    go(Math.round(-(p.x + p.v * 9) / step()));
    setDragging(false);
  };
  const onClickCap = (e: React.MouseEvent) => {
    if (p.moved > 6 && !p.down) {
      e.stopPropagation();
      e.preventDefault();
    }
    p.moved = 0;
  };

  const cur = Math.min(slide, max);
  const cardBasis = `calc((100% - ${GAP * (VISIBLE - 1)}px) / ${VISIBLE})`;

  return (
    <>
      <div
        ref={wrap}
        data-tour="jars"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCap}
        style={{
          gridColumn: 1,
          gridRow: 2,
          position: "relative",
          zIndex: lift ? 6 : 1,
          overflowX: "clip",
          overflowY: "visible",
          margin: "-12px -6px -34px",
          padding: "12px 6px 34px",
          touchAction: "none",
          userSelect: "none",
          cursor: dragging || lift ? "grabbing" : "grab",
        }}
      >
        <div ref={track} style={{ display: "flex", gap: GAP, willChange: "transform" }}>
          {cards.map(({ goal: g, plan: pl, msg, sub, msgColor }) => (
            <div key={g.id} data-card={g.id} style={{ flex: `0 0 ${cardBasis}`, display: "flex", position: "relative" }}>
              {lift?.id === g.id && (
                <div
                  role="status"
                  style={{
                    position: "absolute",
                    top: -46,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 7,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 16px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#fff",
                    background: lift.armed ? "#a8443a" : "linear-gradient(150deg,rgba(14,26,20,.92),rgba(18,40,30,.86))",
                    boxShadow: "0 12px 24px -12px rgba(12,30,22,.7)",
                    transition: "background .2s ease",
                    pointerEvents: "none",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" />
                  </svg>
                  {lift.armed ? t("Release to delete") : t("Pull up to delete")}
                </div>
              )}
              <div
                className="rb-jar-shell"
                style={{
                  flex: 1,
                  minWidth: 0,
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  padding: 14,
                  borderRadius: 32,
                  background: pl.done
                    ? "linear-gradient(145deg,rgba(214,246,226,.85),rgba(190,236,207,.5))"
                    : "linear-gradient(145deg,rgba(255,255,255,.72),rgba(255,255,255,.38))",
                  backdropFilter: "blur(24px) saturate(170%)",
                  border: "1px solid rgba(255,255,255,.8)",
                  boxShadow: "inset 0 1px 1px #fff,inset 0 -10px 24px -18px rgba(255,255,255,.8),0 24px 48px -30px rgba(20,48,34,.32)",
                  transition: `transform .5s ${ease},box-shadow .5s ${ease}`,
                }}
              >
                <div style={{ position: "relative", height: 226, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 18 }}>
                  <Jar color={g.color} coins={coinsFor(g)} drop={g.id === dropId} sparkToken={sparks[g.id] ?? 0} sway={sway} reduced={reduced} />
                </div>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    padding: "20px 20px 18px",
                    borderRadius: 24,
                    background: pl.done ? "linear-gradient(160deg,#effbf3,#ddf5e6)" : "#fff",
                    transition: "background .6s ease",
                    boxShadow: "0 1px 2px rgba(20,48,34,.06),0 16px 30px -22px rgba(20,48,34,.4)",
                  }}
                >
                  {g.important && !pl.done && (
                    <div
                      title={t("Important")}
                      style={{
                        position: "absolute",
                        left: 14,
                        top: 14,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(224,144,42,.14)",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="#e0902a" aria-hidden="true">
                        <path d="M8 1.6l1.95 4 4.4.6-3.2 3.1.78 4.4L8 11.6l-3.93 2.1.78-4.4L1.65 6.2l4.4-.6Z" />
                      </svg>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={t("Edit goal")}
                    title={t("Edit goal")}
                    className="rb-hover-bg"
                    onClick={() => onEdit(g.id)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 12,
                      width: 30,
                      height: 30,
                      padding: 0,
                      border: 0,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      background: "transparent",
                      color: "#8b9a93",
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5V10.5Z" />
                    </svg>
                  </button>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 11px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#fff",
                      background: pl.done ? "linear-gradient(150deg,#1fc172,#0f9a56)" : "linear-gradient(150deg,#f0a23c,#e0902a)",
                    }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(255,255,255,.3)" }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff" }} />
                    </div>
                    {pl.done ? t("Completed") : t("In progress")}
                  </div>
                  <div
                    style={{
                      fontSize: 21,
                      fontWeight: 700,
                      letterSpacing: "-.02em",
                      color: "#121a16",
                      marginTop: 12,
                      maxWidth: "100%",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {g.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8b9a93", marginTop: 3 }}>
                    {pl.done
                      ? t("Amount saved")
                      : pl.free
                        ? t("Amount needed")
                        : g.deadline
                          ? t("Save {amt} until {date}", { amt: `${money(pl.now)}${perOf(g.freq)}`, date: shortDate(g.deadline) })
                          : t("Plan: {amt}", { amt: `${money(pl.now)}${perOf(g.freq)}` })}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 2 }}>
                    <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.03em", color: "#121a16" }}>{money(g.saved)}</div>
                    {!pl.done && <div style={{ fontSize: 20, fontWeight: 700, color: "#b3beb9" }}>{`/${Math.round(g.target).toLocaleString("en-US")}`}</div>}
                  </div>
                  <div style={{ width: "100%", height: 8, borderRadius: 4, background: lighten(g.color, 0.85), overflow: "hidden", marginTop: 12 }}>
                    <div
                      style={{
                        width: `${Math.min(100, g.target ? (g.saved / g.target) * 100 : 0)}%`,
                        height: "100%",
                        borderRadius: 4,
                        background: g.color,
                        transition: `width 1.4s ${ease}`,
                      }}
                    />
                  </div>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 3, marginTop: 12, minHeight: 34 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: msgColor }}>{msg}</div>
                    <div style={{ fontSize: 11.5, color: "#8b9a93" }}>{sub}</div>
                  </div>
                  <div style={{ width: "100%", display: "flex", gap: 8, marginTop: 14 }}>
                    <button
                      type="button"
                      className="rb-hover-scale"
                      onClick={() => onAdd(g.id)}
                      style={{
                        flex: 1,
                        padding: 13,
                        border: 0,
                        borderRadius: 14,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "#fff",
                        background: "linear-gradient(150deg,#26342d,#18221d)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,.1),0 8px 14px -10px rgba(12,24,18,.65)",
                      }}
                    >
                      {t("Add money")}
                    </button>
                    <button
                      type="button"
                      aria-label={t("Withdraw")}
                      title={t("Withdraw")}
                      className="rb-hover-bg"
                      onClick={() => onWithdraw(g.id)}
                      style={{
                        width: 46,
                        flex: "none",
                        padding: 0,
                        border: 0,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                        color: "#5d6f67",
                        background: "rgba(18,38,30,.05)",
                      }}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M8 3.5v9M4 8.5l4 4 4-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            data-tour="new-jar"
            onClick={onNew}
            className="rb-jar-new"
            style={{
              flex: `0 0 ${cardBasis}`,
              boxSizing: "border-box",
              minHeight: 460,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              borderRadius: 32,
              cursor: "pointer",
              background: "transparent",
              fontFamily: "inherit",
              border: "1.5px dashed rgba(18,38,30,.14)",
              color: "#6b7a73",
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            <div style={{ width: 46, height: 46, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(18,38,30,.05)" }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M8 3v10M3 8h10" />
              </svg>
            </div>
            {t("New jar")}
          </button>
        </div>
      </div>
      <style>{`.rb-jar-shell:hover{transform:translateY(-4px);box-shadow:inset 0 1px 1px #fff,inset 0 -10px 24px -18px rgba(255,255,255,.8),0 30px 52px -30px rgba(20,48,34,.4)!important}[data-card][data-armed="1"] .rb-jar-shell{box-shadow:inset 0 1px 1px #fff,0 0 0 2px rgba(168,68,58,.55),0 30px 52px -26px rgba(168,68,58,.45)!important}.rb-jar-new{transition:border-color .35s ease,color .35s ease,background .35s ease}.rb-jar-new:hover{border-color:rgba(23,184,102,.5)!important;color:#0b7a45!important;background:rgba(255,255,255,.3)!important}`}</style>
      <div style={{ gridColumn: 1, gridRow: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <button type="button" aria-label={t("Previous")} onClick={() => go(ph.current.slide - 1)} className="rb-hover-scale" style={{ ...navBtn, opacity: cur > 0 ? 1 : 0.35 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 3 5 8l5 5" />
          </svg>
        </button>
        <div style={{ display: "flex", gap: 7 }}>
          {Array.from({ length: max + 1 }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}`}
              onClick={() => go(i)}
              style={{
                height: 7,
                width: i === cur ? 22 : 7,
                padding: 0,
                border: 0,
                borderRadius: 4,
                cursor: "pointer",
                background: i === cur ? "#17b866" : "rgba(18,38,30,.16)",
                transition: `width .45s ${ease},background .3s ease`,
              }}
            />
          ))}
        </div>
        <button type="button" aria-label={t("Next")} onClick={() => go(ph.current.slide + 1)} className="rb-hover-scale" style={{ ...navBtn, opacity: cur < max ? 1 : 0.35 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 3 5 5-5 5" />
          </svg>
        </button>
      </div>
    </>
  );
}
