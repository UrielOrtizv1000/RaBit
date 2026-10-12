/**
 * Definición de los tutoriales guiados: uno principal (primera vez, en Home) y uno corto por página o ventana.
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
    { title: "Welcome to RaBit", body: "A short tour of the tools. You can skip it now and repeat it any time from Settings → Data → Tutorial." },
    { title: "Light and dark", body: "Click the RABIT logo to switch between the light and dark theme.", target: "logo" },
    { title: "Search", body: "Search your events, tasks and notes. Press Ctrl+K from anywhere to jump here.", target: "search" },
    { title: "Create fast", body: "Add an event, note or task from here, or press Ctrl+N to create in the page you are on.", target: "create" },
    { title: "Calendar", body: "Click an empty slot in the Calendar to create an event right there.", target: "nav-calendar" },
    { title: "Routine", body: "Click a routine block to see its details; the arrow in its card takes you back.", target: "nav-routine" },
    {
      title: "Quick Notes and tags",
      body: "Drag the tag bar sideways to see more tags. Double-click a tag to edit it, use the magnifier to search, and + to create a new one.",
      target: "nav-notes",
    },
    { title: "Savings", body: "Each goal is a jar. Add money, set a deadline and RaBit tells you how much to save per week.", target: "nav-savings" },
    {
      title: "Hold and slide to delete",
      body: "Press and hold a task, event or note, then slide it to the left to delete it. In Savings, hold a jar and pull it up. An Undo button appears right after. Click any item to open and edit it.",
    },
    { title: "Notifications", body: "The bell lists what is pending today and anything overdue. Click one to open it.", target: "bell" },
    { title: "Settings", body: "Language, text size, time format, backups and this tutorial live here.", target: "settings" },
  ],
  calendar: [
    { title: "Calendar", body: "Your month, week, day or year at a glance. Everything you create here also shows up in Home." },
    { title: "Move through time", body: "Use the arrows to go back or forward. Click the label in the middle to jump to today.", target: "cal-nav" },
    { title: "Four views", body: "Switch between Month, Week, Day and Year.", target: "cal-views" },
    { title: "Create right there", body: "Click an empty slot to create an event at that time. Hold an event and slide it to the left to delete it.", target: "cal-grid" },
    { title: "New event", body: "Or use this button, or press Ctrl+N.", target: "cal-new" },
  ],
  routine: [
    { title: "Routine", body: "Blocks that repeat every week (or every few weeks). Calendar items always sit on top of them and clashes are flagged. Routine is still in beta." },
    { title: "Add a routine", body: "Pick the days, the hours, a color and how often it repeats.", target: "rt-add" },
    {
      title: "Your week",
      body: "Click a block to see its details, edit or remove it; the arrow in its card takes you back. Click an empty slot to add one there.",
      target: "rt-grid",
    },
    { title: "Other weeks", body: "Move between weeks with the arrows. Click the label to come back to this week.", target: "rt-nav" },
  ],
  notes: [
    { title: "Quick Notes", body: "Capture something before you forget. Notes save by themselves as you type." },
    { title: "New note", body: "Start a new note here, or press Ctrl+N.", target: "panel-new" },
    { title: "Search and filter", body: "Search by title, text or tag, and filter by All, Pinned or Deleted. Deleted notes stay 30 days in the trash.", target: "panel-search" },
    {
      title: "Tags",
      body: "Open a note to tag it. Drag the tag bar sideways to see more tags, double-click a tag to edit it, use the magnifier to search and + to create a new one.",
      target: "note-tags",
    },
    { title: "Organize", body: "Pin a note, add it to your tasks or move it to the trash from the detail on this side.", target: "panel-detail" },
  ],
  savings: [
    { title: "Savings", body: "Each goal is a jar. Add money and watch the coins pile up; RaBit keeps your weekly streak." },
    { title: "Create a jar", body: "Pick a goal amount and how to plan it: just a goal, a deadline, or what you can save.", target: "new-goal" },
    {
      title: "Your jars",
      body: "Add or withdraw money, edit a jar with the pencil and drag sideways to browse. To delete one, hold it and pull it up (you can undo).",
      target: "jars",
    },
    { title: "Streak", body: "Deposit at least once a week to keep your streak alive.", target: "streak" },
    { title: "What can I save?", body: "Try an amount per week or month and see which jars it would cover. Turn it into a jar in one click.", target: "calculator" },
  ],
  goal: [
    {
      title: "Three ways to plan",
      body: "Just a goal has no plan. With a deadline, RaBit tells you how much to save per week and adds the date to your Calendar. With what you can save, it tells you when you will get there.",
      target: "goal-modes",
    },
    { title: "RaBit does the math", body: "This is how much you need to save, or when you will reach the goal.", target: "goal-result" },
    { title: "Important jars", body: "Turn this on and the jar always comes first.", target: "goal-important" },
  ],
  move: [
    { title: "Add or withdraw", body: "Switch between putting money in and taking it out.", target: "move-mode" },
    { title: "How much?", body: "Type an amount or use the quick buttons below it. RaBit shows how it changes your plan before you confirm.", target: "move-amt" },
  ],
  panel: [
    { title: "Events, notes and tasks", body: "Everything lives in one place. Switch the type here.", target: "panel-tabs" },
    { title: "Create", body: "Start a new item from here.", target: "panel-new" },
    { title: "Search and filter", body: "Find items by text and narrow the list with the filters.", target: "panel-search" },
    { title: "Details", body: "Changes save automatically. Press Esc to close the panel.", target: "panel-detail" },
  ],
  settings: [
    { title: "Make RaBit yours", body: "Choose which modules are on, your time format, language, theme and text size." },
    { title: "Backups", body: "Everything lives on this device. Export a .json to keep a copy, or import one." },
    { title: "Tutorials", body: "Settings → Data → Tutorial shows all the tips again." },
  ],
};
