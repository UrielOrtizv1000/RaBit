/**
 * Modelo del panel de Eventos · Notas · Tareas: selección, pestañas y textos por tipo.
 */
import { t } from "../../i18n";
import type { PanelKind, PanelState } from "../../store/ui";

export type Sel = { id: string | null; key: string; seed?: PanelState["seed"] } | null;

export const kindOptions = () =>
  [
    ["event", t("EVENTS")],
    ["note", t("NOTES")],
    ["task", t("TASKS")],
  ] as const;
export const labelsFor = (k: PanelKind): { newLabel: string; search: string; bulk: string } =>
  k === "task"
    ? { newLabel: t("New task"), search: t("Search tasks…"), bulk: t("Delete done tasks") }
    : k === "event"
      ? { newLabel: t("New event"), search: t("Search events…"), bulk: t("Delete past events") }
      : { newLabel: t("New note"), search: t("Search notes…"), bulk: t("Empty trash") };

export const fromPanel = (p: PanelState | null): Sel => (p ? (p.id ? { id: p.id, key: p.id } : { id: null, key: `new-${Date.now()}`, seed: p.seed }) : null);
