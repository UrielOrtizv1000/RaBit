/**
 * Definición de los tutoriales guiados: uno principal (primera vez, en Home, 4 pasos) y uno mínimo (1–2 pasos) por página o ventana.
 * Cada paso puede señalar un elemento con `data-tour="…"`; si no existe en pantalla, la tarjeta se queda al centro.
 * Los textos (en inglés = clave i18n) tienen su traducción en `src/i18n/es/tours.ts` (un test lo verifica).
 */
export type TourId = "main" | "calendar" | "routine" | "notes" | "savings" | "goal" | "move" | "panel" | "settings";

export interface TourStep {
  title: string;
  body: string;
  target?: string;
}

export const TOURS: Record<TourId, TourStep[]> = {
  main: [
    { title: "Welcome to RaBit", body: "Everything stays on this device. Press Ctrl+K to search and Ctrl+N to create. You can repeat this tour from Settings → Data → Tutorial." },
    { title: "Create fast", body: "Add an event, note or task from here.", target: "create" },
    { title: "Hold and slide to delete", body: "Press and hold an item, then slide it left to delete it. An Undo button appears right after." },
    { title: "Settings", body: "Language, theme, text size, backups and this tutorial live here.", target: "settings" },
  ],
  calendar: [
    { title: "Create right there", body: "Click an empty slot to create an event at that time.", target: "cal-grid" },
    { title: "Views and dates", body: "Switch between Month, Week, Day and Year. Click the date label to jump to today.", target: "cal-views" },
  ],
  routine: [
    { title: "Your week", body: "Blocks repeat every week. Click an empty slot to add one, or a block to edit it. Routine is still in beta.", target: "rt-grid" },
    { title: "Add a routine", body: "Pick the days, the hours, a color and how often it repeats.", target: "rt-add" },
  ],
  notes: [
    { title: "Quick Notes", body: "Notes save as you type. Search, pin or tag them; deleted notes stay 30 days in the trash.", target: "panel-search" },
    { title: "Tags", body: "Open a note to tag it. Drag the tag bar sideways to see more, double-click a tag to edit it.", target: "note-tags" },
  ],
  savings: [
    { title: "Your jars", body: "Each goal is a jar. Add or withdraw money; to delete one, hold it and pull it up.", target: "jars" },
    { title: "Create a jar", body: "Set an amount and, if you want, a deadline. RaBit does the math.", target: "new-goal" },
  ],
  goal: [
    { title: "Three ways to plan", body: "Just a goal, a deadline (RaBit tells you how much to save per week) or what you can save (RaBit tells you when).", target: "goal-modes" },
  ],
  move: [{ title: "Add or withdraw", body: "Switch the mode, type an amount and RaBit shows how it changes your plan.", target: "move-amt" }],
  panel: [
    { title: "Events, notes and tasks", body: "Everything lives here. Changes save by themselves; press Esc to close.", target: "panel-tabs" },
    { title: "Search and filter", body: "Find items by text and narrow the list with the filters.", target: "panel-search" },
  ],
  settings: [{ title: "Make RaBit yours", body: "Choose your modules, language, theme and text size. Everything lives on this device: export a .json to keep a copy." }],
};
