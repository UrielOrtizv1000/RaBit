/**
 * Constantes de la rejilla horaria que comparten Calendar y Routine.
 * (Antes estaban en "shared.tsx" junto con componentes no relacionados.)
 */

/** Color de las tareas dentro de la rejilla (morado, distinto de los colores de evento). */
export const TASK_COLOR = "#8a6fd6";
/** Alto en px de una hora en la rejilla. */
export const ROW = 38;

/** Estilos de hover/transición de la rejilla (los estilos en línea no pueden hacer :hover). */
export const SHARED_CSS = `
.rbc-btn:hover{background:rgba(238,250,243,1)!important}
.rbc-today:hover{background:rgba(215,244,229,.9)!important}
.rbc-day:hover{background:rgba(238,250,243,.9)!important}
.rbc-chip:hover{background:rgba(255,255,255,.95)!important}
.rbc-primary:hover{background:#16211c!important}
.rbc-blk:hover{box-shadow:0 12px 22px -12px rgba(18,60,40,.7)!important}
.rbc-lift{transition:transform .15s ease-out}
.rbc-lift:hover{transform:translateY(-1px)}
.rbc-scale{transition:transform .15s ease-out}
.rbc-scale:hover{transform:scale(1.02)}
.rbc-month:hover{background:rgba(238,250,243,.85)!important}
.rbc-ghost:hover{background:#fff!important}
.rbc-close:hover{background:rgba(18,38,30,.06)!important}
.rbc-cell:hover{background:rgba(23,184,102,.06)}
`;
