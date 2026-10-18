/**
 * Onboarding: módulos que se pueden elegir y constantes compartidas por el formulario y el panel.
 */
import type { Modules } from "../../domain/types";

export const MODS: { id: keyof Modules; desc: string; soon?: boolean }[] = [
  { id: "calendar", desc: "Events, tasks and RaBit reminders." },
  { id: "routine", desc: "Your recurring week, wake-up and bedtime." },
  { id: "notes", desc: "Fast notes you can turn into tasks." },
  { id: "savings", desc: "Set goals and track what you save." },
];
export const IDS = MODS.map((m) => m.id);
export const E = "cubic-bezier(.22,1,.36,1)";
