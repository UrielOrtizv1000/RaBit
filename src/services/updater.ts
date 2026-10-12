/**
 * Actualizaciones automáticas dentro de la app.
 *
 * Estados: idle → checking → available → downloading → ready (o error). La revisión es silenciosa: si no hay versión
 * nueva no se muestra nada. Todo el trabajo con el exterior pasa por un `UpdateBackend`, así la máquina de estados se
 * prueba sin Tauri y el modo de simulación (desarrollo) usa el mismo flujo que el real.
 *
 *  - Producción en Tauri: `tauri-plugin-updater` + `tauri-plugin-process` (relaunch).
 *  - Desarrollo: no se revisa nada real; con `VITE_RABIT_UPDATE_SIM=1` (o `?update-sim`) se simula el flujo completo.
 *  - Navegador en producción: no hay actualizador (no aplica).
 */
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { logWarn } from "../lib/log";

export type UpdaterStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

export interface UpdateInfo {
  version: string;
  /** notas de la versión, una por línea (ya sin viñetas ni encabezados) */
  notes: string[];
}

export interface UpdateBackend {
  currentVersion(): Promise<string>;
  /** Busca una versión nueva; null si no hay. */
  check(): Promise<UpdateInfo | null>;
  /** Descarga la versión encontrada por el último `check()`. */
  download(onProgress: (fraction: number) => void): Promise<void>;
  /** Instala lo descargado (en Windows el instalador cierra la app). */
  install(): Promise<void>;
  relaunch(): Promise<void>;
}

export interface UpdaterStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** Aviso «acabas de actualizar» para la terminal de RaBit. */
export interface UpdatedNotice {
  version: string;
  notes: string[];
}

export interface UpdaterState {
  status: UpdaterStatus;
  /** 0–1, solo con sentido en downloading/ready */
  progress: number;
  /** versión instalada ahora */
  current: string;
  /** versión nueva disponible */
  next: UpdateInfo | null;
  error: string | null;
  updated: UpdatedNotice | null;
}

export interface UpdaterApi {
  /** Revisión silenciosa. Los errores de red no se muestran (se reintenta en la siguiente ronda). */
  check(): Promise<void>;
  /** Descarga la actualización (no bloquea la app). */
  download(): Promise<void>;
  /** Instala y reinicia (requiere `ready`). */
  restartNow(): Promise<void>;
  /** Cierre de la app con una actualización ya descargada: se instala al salir. */
  installOnExit(): Promise<void>;
  /** Tras un error: reintenta lo que falló. */
  retry(): Promise<void>;
  /** Compara la versión actual con la última vista para mostrar «UPDATED TO …» una sola vez. */
  detectUpdated(): Promise<void>;
  dismissUpdated(): void;
}

export type UpdaterStore = UseBoundStore<StoreApi<UpdaterState>> & { api: UpdaterApi };

const K_LAST_SEEN = "rabit.updater.lastSeenVersion";
const K_PENDING = "rabit.updater.pending";
export const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

/** Notas del manifiesto → líneas limpias (sin «- », «* », «#», negritas). */
export function parseNotes(body: string | undefined | null): string[] {
  return (body ?? "")
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/^\s*(?:[-*•]|\d+\.)\s+/, "")
        .replace(/^\s*#{1,6}\s*/, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .trim(),
    )
    .filter(Boolean);
}

const msg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Crea la tienda del actualizador con un backend y un almacenamiento dados (testeable). */
export function createUpdater(backend: UpdateBackend, storage: UpdaterStorage): UpdaterStore {
  const useStore = create<UpdaterState>(() => ({ status: "idle", progress: 0, current: "", next: null, error: null, updated: null }));
  const set = useStore.setState;
  const get = useStore.getState;
  let failedStep: "download" | "install" | null = null;

  const api: UpdaterApi = {
    async check() {
      const { status } = get();
      if (status === "checking" || status === "downloading" || status === "ready") return;
      const before = status;
      set({ status: "checking", error: null });
      try {
        const current = await backend.currentVersion();
        const info = await backend.check();
        if (info) set({ status: "available", next: info, current, progress: 0 });
        else set({ status: "idle", next: null, current });
      } catch (e) {
        logWarn("updater.check", e);
        set({ status: before === "error" ? "error" : "idle" });
      }
    },

    async download() {
      const { status, next } = get();
      if (!next || (status !== "available" && status !== "error")) return;
      set({ status: "downloading", progress: 0, error: null });
      failedStep = null;
      try {
        await backend.download((f) => set({ progress: Math.max(0, Math.min(1, f)) }));
        storage.set(K_PENDING, JSON.stringify({ version: next.version, notes: next.notes }));
        set({ status: "ready", progress: 1 });
      } catch (e) {
        logWarn("updater.download", e);
        failedStep = "download";
        set({ status: "error", error: msg(e) });
      }
    },

    async restartNow() {
      if (get().status !== "ready") return;
      try {
        await backend.install();
        await backend.relaunch();
      } catch (e) {
        logWarn("updater.install", e);
        failedStep = "install";
        set({ status: "error", error: msg(e) });
      }
    },

    async installOnExit() {
      if (get().status !== "ready") return;
      try {
        await backend.install();
      } catch (e) {
        logWarn("updater.installOnExit", e);
      }
    },

    async retry() {
      if (get().status !== "error") return;
      if (failedStep === "install") {
        set({ status: "ready", error: null });
        return api.restartNow();
      }
      if (get().next) return api.download();
      set({ status: "idle", error: null });
      return api.check();
    },

    async detectUpdated() {
      try {
        const current = await backend.currentVersion();
        set({ current });
        const last = storage.get(K_LAST_SEEN);
        storage.set(K_LAST_SEEN, current);
        if (last === null || last === current) return;
        let notes: string[] = [];
        try {
          const p = JSON.parse(storage.get(K_PENDING) ?? "null") as { version?: string; notes?: string[] } | null;
          if (p && p.version === current && Array.isArray(p.notes)) notes = p.notes;
        } catch (e) {
          logWarn("updater.pending", e);
        }
        storage.remove(K_PENDING);
        set({ updated: { version: current, notes } });
      } catch (e) {
        logWarn("updater.detect", e);
      }
    },

    dismissUpdated() {
      set({ updated: null });
    },
  };

  return Object.assign(useStore, { api });
}

// ------------------------------------------------------------------ backends

const noopBackend = (version: string): UpdateBackend => ({
  currentVersion: async () => version,
  check: async () => null,
  download: async () => undefined,
  install: async () => undefined,
  relaunch: async () => undefined,
});

/** Backend real (Tauri). Los plugins se importan al usarlos para no cargarlos fuera de la app de escritorio. */
function tauriBackend(): UpdateBackend {
  let pending: import("@tauri-apps/plugin-updater").Update | null = null;
  return {
    async currentVersion() {
      const { getVersion } = await import("@tauri-apps/api/app");
      return getVersion();
    },
    async check() {
      const { check } = await import("@tauri-apps/plugin-updater");
      pending = await check();
      return pending ? { version: pending.version, notes: parseNotes(pending.body) } : null;
    },
    async download(onProgress) {
      if (!pending) throw new Error("No update to download");
      let total = 0;
      let got = 0;
      await pending.download((e) => {
        if (e.event === "Started") total = e.data.contentLength ?? 0;
        else if (e.event === "Progress") {
          got += e.data.chunkLength;
          if (total > 0) onProgress(got / total);
        } else onProgress(1);
      });
    },
    async install() {
      if (!pending) throw new Error("No update to install");
      await pending.install();
    },
    async relaunch() {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    },
  };
}

const SIM_KEY = "rabit.updater.simInstalled";

/** Versión mayor inmediata de `v` (0.1.0 → 0.2.0), para simular «hay una nueva». */
export const nextMinor = (v: string): string => {
  const [maj, min] = v.split(".").map((n) => parseInt(n, 10) || 0);
  return `${maj}.${min + 1}.0`;
};

/** Simulación para desarrollo: recorre available → downloading → ready → «reinicio» sin publicar nada. */
export function simBackend(realVersion: string, storage: UpdaterStorage, opts: { checkMs?: number; downloadMs?: number; reload?: () => void } = {}): UpdateBackend {
  const { checkMs = 1500, downloadMs = 4000, reload = () => location.reload() } = opts;
  const installed = () => storage.get(SIM_KEY) ?? realVersion;
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  return {
    currentVersion: async () => installed(),
    async check() {
      await wait(checkMs);
      const version = nextMinor(realVersion);
      if (installed() === version) return null; // ya «instalada» en una simulación anterior
      return { version, notes: ["Simulated release notes", "A brand new tool you can try", "Smoother animations and small fixes"] };
    },
    async download(onProgress) {
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        await wait(downloadMs / steps);
        onProgress(i / steps);
      }
    },
    install: async () => undefined,
    async relaunch() {
      storage.set(SIM_KEY, nextMinor(realVersion));
      reload();
    },
  };
}

export const browserStorage: UpdaterStorage = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      logWarn("updater.storage", e);
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      logWarn("updater.storage", e);
    }
  },
  remove: (k) => {
    try {
      localStorage.removeItem(k);
    } catch (e) {
      logWarn("updater.storage", e);
    }
  },
};

declare const __APP_VERSION__: string;
const appVersion = (): string => (typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0");
const isTauriApp = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** ¿Modo simulación? Solo en desarrollo: variable de entorno o `?update-sim` en la URL. */
export function simRequested(): boolean {
  if (!import.meta.env.DEV) return false;
  return Boolean(import.meta.env.VITE_RABIT_UPDATE_SIM) || (typeof location !== "undefined" && new URLSearchParams(location.search).has("update-sim"));
}

function chooseBackend(): UpdateBackend {
  if (import.meta.env.DEV) return simRequested() ? simBackend(appVersion(), browserStorage) : noopBackend(appVersion());
  return isTauriApp() ? tauriBackend() : noopBackend(appVersion());
}

/** La tienda de la app. */
export const useUpdater: UpdaterStore = createUpdater(chooseBackend(), browserStorage);

/**
 * Arranca el actualizador: detecta «acabas de actualizar», revisa ahora y cada 6 h, y deja instalar al salir si hay una
 * actualización descargada. Devuelve la función que lo detiene.
 */
export function startUpdater(): () => void {
  const { api } = useUpdater;
  void api.detectUpdated();
  void api.check();
  const timer = setInterval(() => void api.check(), CHECK_EVERY_MS);
  let unlisten: (() => void) | undefined;
  let stopped = false;
  if (isTauriApp() && !import.meta.env.DEV) {
    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      const off = await win.onCloseRequested(async (event) => {
        if (useUpdater.getState().status !== "ready") return;
        event.preventDefault();
        try {
          await api.installOnExit(); // en Windows el instalador cierra la app por su cuenta
        } finally {
          await win.destroy();
        }
      });
      if (stopped) off();
      else unlisten = off;
    })();
  }
  return () => {
    stopped = true;
    clearInterval(timer);
    unlisten?.();
  };
}
