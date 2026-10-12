/**
 * Scroll horizontal arrastrando con el mouse (o el dedo) desde cualquier punto de un contenedor.
 * Por debajo de DRAG_PX es un clic normal; al superarlo se mueve el scroll y se descarta el clic que sigue al soltar.
 */
import type { PointerEvent, MouseEvent } from "react";

const DRAG_PX = 5;

export function dragScroll() {
  let startX = 0;
  let startLeft = 0;
  let down = false;
  let dragged = false;
  return {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.button !== 0) return;
      down = true;
      dragged = false;
      startX = e.clientX;
      startLeft = e.currentTarget.scrollLeft;
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!dragged && Math.abs(dx) < DRAG_PX) return;
      if (!dragged) {
        dragged = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      e.currentTarget.scrollLeft = startLeft - dx;
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      down = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    },
    onClickCapture(e: MouseEvent<HTMLElement>) {
      if (!dragged) return;
      dragged = false;
      e.stopPropagation();
      e.preventDefault();
    },
  };
}
