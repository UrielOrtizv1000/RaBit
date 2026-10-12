/**
 * Estado de los tutoriales: cuáles ya se vieron (localStorage) y cuándo arrancar uno.
 * `rabit.tutorial.seen` guarda el principal ("1" = visto; "off" = todos los tutoriales desactivados, lo usan las pruebas);
 * cada tutorial de página/ventana guarda `rabit.tour.<id>`.
 */
import { useUi } from "../store/ui";
import { logWarn } from "../lib/log";
import { TOURS, type TourId } from "./tours";

const MAIN_KEY = "rabit.tutorial.seen";
const keyOf = (id: TourId): string => (id === "main" ? MAIN_KEY : `rabit.tour.${id}`);

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    logWarn("tour.read", e);
    return null;
  }
};

export const toursOff = (): boolean => read(MAIN_KEY) === "off";
export const tourSeen = (id: TourId): boolean => read(keyOf(id)) !== null;

export function markTourSeen(id: TourId): void {
  try {
    if (!toursOff()) localStorage.setItem(keyOf(id), "1");
  } catch (e) {
    logWarn("tour.write", e);
  }
}

/** Vuelve a mostrar todos los tutoriales (Ajustes → Datos → Tutorial). */
export function resetTours(): void {
  try {
    for (const id of Object.keys(TOURS) as TourId[]) localStorage.removeItem(keyOf(id));
  } catch (e) {
    logWarn("tour.reset", e);
  }
}

/** Arranca el tutorial `id` si no se ha visto, no hay otro abierto y el principal ya se vio (los de página van después). */
export function maybeStartTour(id: TourId): void {
  if (toursOff() || useUi.getState().tour || tourSeen(id)) return;
  if (id !== "main" && !tourSeen("main")) return;
  useUi.getState().openTour(id);
}
