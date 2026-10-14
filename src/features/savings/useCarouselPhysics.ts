/**
 * Carrusel de frascos: física y gestos (arrastre con inercia y resorte, levantar un frasco para borrarlo, reordenar con FLIP).
 * Publica la aceleración en `sway` para que los frascos se balanceen.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getZoom } from "../../lib/zoom";
import type { Sway } from "./Jar";

export const GAP = 16;
export const LIFT_AT = 90; // px arrastrados hacia arriba para armar el borrado
export const VISIBLE = 3;
export const ease = "cubic-bezier(.22,1,.36,1)";
export const navBtn = {
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

interface Args {
  cards: { goal: { id: string } }[];
  dropId: string | null;
  followId: string | null;
  reduced: boolean;
  onDelete: (id: string) => void;
}

export function useCarouselPhysics({ cards, dropId, followId, reduced, onDelete }: Args) {
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
  return { wrap, track, sway, ph, lift, slide, dragging, max, cur, go, onDown, onMove, onUp, onClickCap };
}
