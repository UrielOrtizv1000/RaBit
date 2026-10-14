/**
 * Inicio: lista de tareas con tachado, asentado y animación FLIP al completarlas (con «Deshacer»).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { scaleOf } from "../../lib/zoom";
import { sortTasks } from "../../domain/logic";
import type { Task } from "../../domain/types";
import { t } from "../../i18n";
import { EASE } from "./parts";

export function useHomeTasks(tasks: Task[], toggleTask: (id: string) => Promise<void>, showToast: (text: string, undo?: () => void) => void) {
  const [unsettled, setUnsettled] = useState<Set<string>>(() => new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  useEffect(() => {
    const m = timers.current;
    return () => {
      m.forEach(clearTimeout);
    };
  }, []);

  const orderedTasks = useMemo<Task[]>(() => {
    const virt = tasks.map((t) => (unsettled.has(t.id) ? { ...t, done: false } : t));
    const byId = new Map(tasks.map((t) => [t.id, t]));
    return sortTasks(virt).map((t) => byId.get(t.id) ?? t);
  }, [tasks, unsettled]);

  const listRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef<Map<string, number>>(new Map());
  const seen = useRef<Set<string> | null>(null);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-tid]"));
    const zf = scaleOf(el);
    const base = el.getBoundingClientRect().top - el.scrollTop * zf;
    const cur = new Map<string, number>();
    rows.forEach((r) => cur.set(r.dataset.tid ?? "", (r.getBoundingClientRect().top - base) / zf));
    const flipped: HTMLElement[] = [];
    rows.forEach((r) => {
      const id = r.dataset.tid ?? "";
      const old = lastPos.current.get(id);
      const nu = cur.get(id) ?? 0;
      if (old === undefined) {
        if (seen.current && !seen.current.has(id)) {
          r.animate(
            [
              { opacity: 0, transform: "translateY(6px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 500, delay: 250, easing: EASE, fill: "backwards" },
          );
        }
        return;
      }
      const d = old - nu;
      if (Math.abs(d) < 1) return;
      r.style.transition = "none";
      r.style.transform = `translateY(${d}px)`;
      flipped.push(r);
    });
    if (flipped.length) {
      void el.offsetHeight;
      requestAnimationFrame(() =>
        flipped.forEach((r) => {
          r.style.transition = `transform .65s ${EASE}, opacity .3s ease-out, background .2s ease-out`;
          r.style.transform = "";
          setTimeout(() => {
            r.style.transition = "";
          }, 700);
        }),
      );
    }
    lastPos.current = cur;
    seen.current = new Set(rows.map((r) => r.dataset.tid ?? ""));
  });

  const onToggle = (tk: Task) => (e: MouseEvent) => {
    e.stopPropagation();
    const id = tk.id;
    const clear = () => {
      const h = timers.current.get(id);
      if (h) clearTimeout(h);
      timers.current.delete(id);
    };
    clear();
    if (!tk.done) {
      setUnsettled((s) => new Set(s).add(id));
      void toggleTask(id);
      timers.current.set(
        id,
        setTimeout(() => {
          timers.current.delete(id);
          setUnsettled((s) => {
            const n = new Set(s);
            n.delete(id);
            return n;
          });
        }, 450),
      );
      showToast(t("Task completed"), () => {
        clear();
        setUnsettled((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
        void toggleTask(id);
      });
    } else {
      setUnsettled((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      void toggleTask(id);
    }
  };

  return { orderedTasks, listRef, onToggle };
}
