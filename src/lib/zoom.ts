/** Factor de escala actual de la página (ver FitPage). Las medidas con getBoundingClientRect salen en px visuales. */
let z = 1;
export const getZoom = (): number => z;
export const setZoom = (v: number): void => {
  z = v;
};

/** Escala real aplicada a un elemento (px visuales / px de layout); no depende del orden de los efectos. */
export const scaleOf = (el: HTMLElement): number => (el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1) || 1;
