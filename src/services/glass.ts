/**
 * Efecto de cristal: pone la opacidad de las superficies (`--glass-a`) y pide al backend activar/desactivar acrylic.
 */
import { isTauri } from "./boot";
import { logWarn } from "../lib/log";

/** Transparencia de cristal MUY sutil. En Windows la ventana de Tauri es transparente (acrylic); en Linux es opaca y nativa;
 *  la interfaz usa --glass-a como opacidad de sus fondos (1 = sin efecto). */
const ALPHA = 0.93;

export async function applyGlass(enabled: boolean): Promise<void> {
  const root = document.documentElement;
  if (!isTauri()) {
    root.style.setProperty("--glass-a", "1");
    return;
  }
  let supported = false;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    supported = await invoke<boolean>("set_glass", { enabled });
  } catch (e) {
    logWarn("glass", e); /* sin soporte: el CSS queda opaco */
  }
  // Sin soporte del sistema (p. ej. Linux) la ventana no es transparente: bajar la opacidad solo dejaría ver el fondo.
  root.style.setProperty("--glass-a", enabled && supported ? String(ALPHA) : "1");
}
