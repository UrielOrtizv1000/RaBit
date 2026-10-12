/**
 * Estado SOLO de interfaz (página activa, panel abierto, ajustes, búsqueda, toast). Nada de esto se persiste.
 */
import { create } from "zustand";
import type { ISODate } from "../domain/types";

export type PageId = "home" | "calendar" | "routine" | "notes" | "savings";
export type PanelKind = "event" | "note" | "task";

/** Panel compartido. id === null → crear uno nuevo. */
export interface PanelState {
  kind: PanelKind;
  id: string | null;
  /** valores iniciales para un ítem nuevo (p. ej. la fecha del día clicado) */
  seed?: { date?: ISODate; time?: string };
}

export interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

interface UiState {
  page: PageId;
  panel: PanelState | null;
  settingsOpen: boolean;
  search: string;
  toast: Toast | null;
  setPage: (p: PageId) => void;
  openPanel: (kind: PanelKind, id?: string | null, seed?: PanelState["seed"]) => void;
  closePanel: () => void;
  setPanelKind: (kind: PanelKind) => void;
  openSettings: (o: boolean) => void;
  setSearch: (q: string) => void;
  showToast: (text: string, undo?: () => void) => void;
  clearToast: () => void;
}

let toastSeq = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useUi = create<UiState>((set) => ({
  page: "home",
  panel: null,
  settingsOpen: false,
  search: "",
  toast: null,
  setPage: (page) => set({ page }),
  openPanel: (kind, id = null, seed) => set({ panel: { kind, id, seed } }),
  closePanel: () => set({ panel: null }),
  setPanelKind: (kind) => set((s) => (s.panel ? { panel: { kind, id: null } } : s)),
  openSettings: (settingsOpen) => set({ settingsOpen }),
  setSearch: (search) => set({ search }),
  showToast: (text, undo) => {
    clearTimeout(toastTimer);
    set({ toast: { id: ++toastSeq, text, undo } });
    toastTimer = setTimeout(() => set({ toast: null }), 3200);
  },
  clearToast: () => set({ toast: null }),
}));
