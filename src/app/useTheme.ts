/**
 * Aplica el tema guardado (light | dark) como atributo `data-theme` en <html>; los estilos oscuros viven en global.css.
 */
import { useEffect } from "react";
import { useData } from "../store/data";

/** Aplica el tema guardado (light | dark) al documento. */
export function useTheme(): "light" | "dark" {
  const theme = useData((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return theme;
}
