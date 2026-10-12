/**
 * Definición de las páginas navegables (id, etiqueta en inglés = clave i18n, icono SVG y si está «próximamente»).
 * Para añadir un módulo: agregar aquí, registrar la página en App.tsx y su clave en Settings.modules.
 */
import type { PageId } from "../store/ui";

export interface NavItem {
  id: PageId;
  label: string;
  d: string;
  soon?: boolean;
}

export const NAV: NavItem[] = [
  { id: "home", label: "Home", d: "M2.6 8.2 9 3l6.4 5.2V15a.8.8 0 0 1-.8.8H3.4a.8.8 0 0 1-.8-.8Z" },
  {
    id: "calendar",
    label: "Calendar",
    d: "M5 3.6h8a2.4 2.4 0 0 1 2.4 2.4v7a2.4 2.4 0 0 1-2.4 2.4H5a2.4 2.4 0 0 1-2.4-2.4V6A2.4 2.4 0 0 1 5 3.6ZM2.6 7.2h12.8M6 2.2v2.6M12 2.2v2.6",
  },
  { id: "routine", label: "Routine", d: "M2.6 9a6.4 6.4 0 1 0 12.8 0a6.4 6.4 0 1 0-12.8 0ZM9 5.4V9l2.4 1.6" },
  { id: "notes", label: "Quick Notes", d: "M4 3.2h7.2L14 6v8.8H4ZM6.4 8.4h5.2M6.4 11.2h3.4" },
  {
    id: "savings",
    label: "Savings",
    soon: true,
    d: "M9 2.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 9 2.8ZM9 5.4v7.2M10.9 7c-.4-.5-1-.7-1.9-.7-1 0-1.9.5-1.9 1.4S8 9 9 9.2c1 .2 1.9.7 1.9 1.6S10 12.3 9 12.3c-.9 0-1.5-.3-1.9-.8",
  },
];
