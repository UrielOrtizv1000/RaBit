import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { scaleOf } from "./zoom";
import { useData } from "../store/data";
import { useUi } from "../store/ui";
import { t } from "../i18n";

/* ───────── Mantener pulsado + deslizar a la izquierda = eliminar ─────────
   Detrás aparece un aviso "Delete", la tarjeta se agita un poco y, al soltar pasado el umbral, se elimina (con Undo). */

export type SwipeKind = "event" | "task" | "note";
export interface SwipeItem {
  kind: SwipeKind;
  id: string;
  title: string;
}

const HOLD_MS = 220,
  DELETE_PX = 90;
interface SwipeState {
  x0: number;
  y0: number;
  armed: boolean;
  dx: number;
  timer: number;
  label?: HTMLElement;
  wobble?: Animation;
  prevBackdrop?: string;
  prevWebkitBackdrop?: string;
}
const states = new WeakMap<HTMLElement, SwipeState>();

const parentScale = (el: HTMLElement): number => {
  const p = el.offsetParent instanceof HTMLElement ? el.offsetParent : el.parentElement;
  return p ? scaleOf(p) : 1;
};

/** Aviso "Delete" que queda detrás de la tarjeta (mismo rectángulo y esquinas). */
function makeLabel(el: HTMLElement): HTMLElement | undefined {
  const parent = el.parentElement;
  if (!parent) return undefined;
  const cs = getComputedStyle(el);
  const lab = document.createElement("div");
  lab.setAttribute("aria-hidden", "true");
  lab.dataset.swipeLabel = "1";
  Object.assign(lab.style, {
    position: "absolute",
    left: `${el.offsetLeft}px`,
    top: `${el.offsetTop}px`,
    width: `${el.offsetWidth}px`,
    height: `${el.offsetHeight}px`,
    borderRadius: cs.borderRadius,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
    paddingRight: "18px",
    pointerEvents: "none",
    opacity: "0",
    transition: "opacity .16s ease-out, background-color .16s ease-out",
    background: "rgba(168,68,58,.16)",
    color: "#a8443a",
    fontFamily: "Silkscreen,monospace",
    fontSize: "10px",
    letterSpacing: ".12em",
    zIndex: "0",
  } as Partial<CSSStyleDeclaration>);
  lab.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5M7 7v4M9 7v4"/></svg><span>' +
    t("DELETE") +
    "</span>";
  parent.insertBefore(lab, el);
  return lab;
}

/** Mientras dura el gesto: se pausan las animaciones ambientales, no se recalcula el ajuste de página y el hover no interfiere. */
const setSwiping = (on: boolean) => {
  const root = document.documentElement;
  if (on) root.dataset.swiping = "1";
  else {
    delete root.dataset.swiping;
    window.dispatchEvent(new Event("resize"));
  }
};
const restoreEl = (el: HTMLElement, st: SwipeState) => {
  if (st.prevBackdrop === undefined) return; // el gesto nunca llegó a activarse
  el.style.willChange = "";
  delete el.dataset.swiping;
  el.style.backdropFilter = st.prevBackdrop ?? "";
  el.style.setProperty("-webkit-backdrop-filter", st.prevWebkitBackdrop ?? "");
};

const cleanup = (el: HTMLElement, st: SwipeState) => {
  st.wobble?.cancel();
  st.label?.remove();
  el.style.rotate = "";
  restoreEl(el, st);
  setSwiping(false);
};

const reset = (el: HTMLElement, st: SwipeState) => {
  el.style.transition = "transform .3s cubic-bezier(.22,1,.36,1),opacity .3s ease-out,outline-color .2s";
  el.style.transform = "";
  el.style.opacity = "";
  el.style.outline = "";
  el.style.cursor = "";
  el.style.zIndex = "";
  const lab = st.label;
  if (lab) {
    lab.style.opacity = "0";
    window.setTimeout(() => lab.remove(), 180);
  }
  st.wobble?.cancel();
  el.style.rotate = "";
  restoreEl(el, st);
  setSwiping(false);
};

async function deleteItem(it: SwipeItem): Promise<void> {
  const d = useData.getState();
  const label = it.title.length > 24 ? it.title.slice(0, 23) + "…" : it.title || t("Untitled");
  const toast = (undo: () => void) => useUi.getState().showToast(t("Deleted “{label}”", { label }), undo);
  if (it.kind === "event") {
    const ev = d.events.find((x) => x.id === it.id);
    if (!ev) return;
    await d.deleteEvent(it.id);
    toast(() => void useData.getState().addEvent(ev));
  } else if (it.kind === "task") {
    const t = d.tasks.find((x) => x.id === it.id);
    if (!t) return;
    await d.deleteTask(it.id);
    toast(() => void useData.getState().addTask(t));
  } else {
    const n = d.notes.find((x) => x.id === it.id);
    if (!n || n.deletedAt !== null) return;
    await d.trashNote(it.id);
    toast(() => void useData.getState().restoreNote(it.id));
  }
}

export interface SwipeProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
  onClickCapture: (e: ReactMouseEvent<HTMLElement>) => void;
}

/** Props de puntero para cualquier fila/tarjeta de evento, tarea o nota. */
export function swipeProps(it: SwipeItem): SwipeProps {
  return {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      // no iniciar el gesto sobre controles interactivos (casillas, botones, inputs)
      if ((e.target as HTMLElement).closest("input,textarea,[role='checkbox'],[role='switch'],a")) return;
      const el = e.currentTarget,
        pid = e.pointerId;
      const st: SwipeState = { x0: e.clientX, y0: e.clientY, armed: false, dx: 0, timer: 0 };
      st.timer = window.setTimeout(() => {
        st.armed = true;
        try {
          el.setPointerCapture(pid);
        } catch {
          /* el puntero ya terminó */
        }
        setSwiping(true);
        el.dataset.swiping = "1";
        el.style.willChange = "transform, opacity";
        st.prevBackdrop = el.style.backdropFilter;
        st.prevWebkitBackdrop = el.style.getPropertyValue("-webkit-backdrop-filter");
        el.style.backdropFilter = "none";
        el.style.setProperty("-webkit-backdrop-filter", "none"); // el desenfoque animado hace vibrar la capa
        st.label = makeLabel(el);
        el.style.transition = "transform .18s cubic-bezier(.22,1,.36,1)";
        el.style.transform = "scale(1.03)";
        el.style.cursor = "grabbing";
        el.style.zIndex = "5";
        if (!el.style.position) el.style.position = "relative";
        st.wobble = el.animate([{ rotate: "-0.45deg" }, { rotate: "0.45deg" }], { duration: 110, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });
      }, HOLD_MS);
      states.set(el, st);
    },
    onPointerMove: (e) => {
      const el = e.currentTarget,
        st = states.get(el);
      if (!st) return;
      const dx = e.clientX - st.x0,
        dy = e.clientY - st.y0;
      if (!st.armed) {
        if (Math.hypot(dx, dy) > 6) {
          clearTimeout(st.timer);
          states.delete(el);
        }
        return;
      }
      const x = Math.min(0, dx) / parentScale(el);
      st.dx = x;
      const past = -x > DELETE_PX;
      el.style.transition = "none";
      el.style.transform = `translateX(${x}px) scale(1.03)`;
      el.style.opacity = String(1 - Math.min(1, -x / 260) * 0.4);
      el.style.outline = past ? "2px solid rgba(168,68,58,.75)" : "2px solid transparent";
      if (st.label) {
        st.label.style.opacity = String(Math.min(1, -x / 50));
        st.label.style.background = past ? "rgba(168,68,58,.28)" : "rgba(168,68,58,.16)";
        const span = st.label.querySelector("span");
        if (span) span.textContent = past ? t("RELEASE TO DELETE") : t("DELETE");
      }
    },
    onPointerUp: (e) => {
      const el = e.currentTarget,
        st = states.get(el);
      if (!st) return;
      clearTimeout(st.timer);
      states.delete(el);
      if (!st.armed) return;
      el.dataset.swiped = "1";
      window.setTimeout(() => {
        delete el.dataset.swiped;
      }, 60);
      if (st.dx < -DELETE_PX) {
        st.wobble?.cancel();
        el.style.rotate = "";
        el.style.transition = "transform .26s cubic-bezier(.4,0,.2,1),opacity .26s ease-out";
        el.style.transform = "translateX(-130%) scale(.96)";
        el.style.opacity = "0";
        window.setTimeout(() => {
          st.label?.remove();
          restoreEl(el, st);
          setSwiping(false);
          void deleteItem(it);
        }, 210);
      } else reset(el, st);
    },
    onPointerCancel: (e) => {
      const el = e.currentTarget,
        st = states.get(el);
      if (!st) return;
      clearTimeout(st.timer);
      states.delete(el);
      if (st.armed) reset(el, st);
      else cleanup(el, st);
    },
    onClickCapture: (e) => {
      if (e.currentTarget.dataset.swiped) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };
}
