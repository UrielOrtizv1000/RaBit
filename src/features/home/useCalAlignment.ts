/**
 * Inicio: alinea la columna derecha con el inicio de la tarjeta principal (se re-mide al cambiar el tamaño o la cantidad de datos).
 */
import { useLayoutEffect, useRef, useState } from "react";

export function useCalAlignment(tasksN: number, eventsN: number, notesN: number, routineN: number) {
  const leftRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [cal, setCal] = useState<{ top: number; h: number }>({ top: 0, h: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const l = leftRef.current,
        h = heroRef.current,
        e = endRef.current;
      if (!l || !h || !e) return;
      // offsetTop = medida de layout: no la afectan ni la escala de la página ni las animaciones de entrada
      void l;
      void e;
      const top = h.offsetTop;
      const height = 0;
      setCal((c) => (c.top === top && c.h === height ? c : { top, h: height }));
    };
    measure();
    const t1 = setTimeout(measure, 120),
      t2 = setTimeout(measure, 600); // tras el ajuste de escala de la página
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (leftRef.current) ro.observe(leftRef.current);
    if (document.fonts) void document.fonts.ready.then(measure);
    return () => {
      ro.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measure);
    };
  }, [tasksN, eventsN, notesN, routineN]);

  return { leftRef, heroRef, endRef, calTop: cal.top };
}
