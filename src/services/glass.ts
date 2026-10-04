/**
 * Efecto de cristal: pone la opacidad de las superficies (`--glass-a`) y pide al backend activar/desactivar acrylic.
 */
import { isTauri } from "./boot";
import { logWarn } from "../lib/log";

/** Transparencia de cristal MUY sutil. La ventana de Tauri es transparente (acrylic en Windows);
 *  la interfaz usa --glass-a como opacidad de sus fondos (1 = sin efecto). */
const ALPHA = 0.93;

export async function applyGlass(enabled: boolean): Promise<void> {
  const on = enabled && isTauri();
  document.documentElement.style.setProperty("--glass-a", on ? String(ALPHA) : "1");
  if (!isTauri()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("set_glass", { enabled });
  } catch (e) {
    logWarn("glass", e); /* plataforma sin soporte: el CSS ya quedó opaco */
  }
}
