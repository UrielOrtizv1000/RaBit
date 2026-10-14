import { describe, expect, it } from "vitest";
import { createUpdater, nextMinor, parseNotes, simBackend, type UpdateBackend, type UpdateInfo, type UpdaterStorage } from "../src/services/updater";

const INFO: UpdateInfo = { version: "1.3.0", notes: ["Savings jars", "Faster start"] };

const memory = (): UpdaterStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v), remove: (k) => void data.delete(k) };
};

/** Backend de mentira con los puntos de fallo configurables y un registro de llamadas. */
function fake(over: Partial<UpdateBackend> = {}, version = "1.2.0") {
  const calls: string[] = [];
  const b: UpdateBackend = {
    currentVersion: async () => version,
    check: async () => {
      calls.push("check");
      return INFO;
    },
    download: async (onProgress) => {
      calls.push("download");
      onProgress(0.25);
      onProgress(0.5);
      onProgress(1);
    },
    install: async () => void calls.push("install"),
    relaunch: async () => void calls.push("relaunch"),
    ...over,
  };
  return { b, calls };
}

describe("useUpdater state machine", () => {
  it("starts idle and a check with nothing new stays silent", async () => {
    const { b } = fake({ check: async () => null });
    const u = createUpdater(b, memory());
    expect(u.getState().status).toBe("idle");
    await u.api.check();
    expect(u.getState()).toMatchObject({ status: "idle", next: null, current: "1.2.0" });
  });

  it("check → available (with version, notes and current version)", async () => {
    const u = createUpdater(fake().b, memory());
    const seen: string[] = [];
    u.subscribe((s) => seen.push(s.status));
    await u.api.check();
    expect(seen).toEqual(["checking", "available"]);
    expect(u.getState()).toMatchObject({ status: "available", next: INFO, current: "1.2.0", error: null });
  });

  it("download reports progress from 0 to 1 and ends in ready", async () => {
    const u = createUpdater(fake().b, memory());
    await u.api.check();
    const progress: number[] = [];
    u.subscribe((s) => s.status === "downloading" && progress.push(s.progress));
    await u.api.download();
    expect(progress).toEqual([0, 0.25, 0.5, 1]);
    expect(u.getState()).toMatchObject({ status: "ready", progress: 1 });
  });

  it("clamps out-of-range progress", async () => {
    const u = createUpdater(
      fake({
        download: async (p) => {
          p(-1);
          p(7);
        },
      }).b,
      memory(),
    );
    await u.api.check();
    const seen: number[] = [];
    u.subscribe((s) => seen.push(s.progress));
    await u.api.download();
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...seen)).toBeLessThanOrEqual(1);
  });

  it("download is ignored unless an update is available", async () => {
    const { b, calls } = fake();
    const u = createUpdater(b, memory());
    await u.api.download();
    expect(calls).toEqual([]);
    expect(u.getState().status).toBe("idle");
  });

  it("restartNow installs and relaunches, in that order, only when ready", async () => {
    const { b, calls } = fake();
    const u = createUpdater(b, memory());
    await u.api.restartNow(); // todavía no hay nada listo
    expect(calls).toEqual([]);
    await u.api.check();
    await u.api.download();
    await u.api.restartNow();
    expect(calls).toEqual(["check", "download", "install", "relaunch"]);
  });

  it("a download failure shows the error state, and Retry downloads again", async () => {
    let fail = true;
    const calls: string[] = [];
    const { b } = fake({
      download: async (p) => {
        calls.push("download");
        if (fail) throw new Error("network down");
        p(1);
      },
    });
    const u = createUpdater(b, memory());
    await u.api.check();
    await u.api.download();
    expect(u.getState()).toMatchObject({ status: "error", error: "network down" });
    expect(u.getState().next).toEqual(INFO); // el panel sigue sabiendo qué versión es

    fail = false;
    await u.api.retry();
    expect(u.getState().status).toBe("ready");
    expect(calls).toHaveLength(2);
  });

  it("an install/signature failure shows the error state and Retry tries to install again", async () => {
    let fail = true;
    const calls: string[] = [];
    const { b } = fake({
      install: async () => {
        calls.push("install");
        if (fail) throw new Error("invalid signature");
      },
      relaunch: async () => void calls.push("relaunch"),
    });
    const u = createUpdater(b, memory());
    await u.api.check();
    await u.api.download();
    await u.api.restartNow();
    expect(u.getState()).toMatchObject({ status: "error", error: "invalid signature" });
    expect(calls).toEqual(["install"]);

    fail = false;
    await u.api.retry();
    expect(calls).toEqual(["install", "install", "relaunch"]);
  });

  it("a failed background check is silent (no error state) and does not break the next round", async () => {
    let fail = true;
    const u = createUpdater(
      fake({
        check: async () => {
          if (fail) throw new Error("offline");
          return INFO;
        },
      }).b,
      memory(),
    );
    await u.api.check();
    expect(u.getState().status).toBe("idle");
    fail = false;
    await u.api.check();
    expect(u.getState().status).toBe("available");
  });

  it("does not re-check while downloading or ready", async () => {
    const { b, calls } = fake();
    const u = createUpdater(b, memory());
    await u.api.check();
    await u.api.download();
    await u.api.check();
    expect(calls.filter((c) => c === "check")).toHaveLength(1);
    expect(u.getState().status).toBe("ready");
  });

  it("installOnExit installs only when an update is already downloaded", async () => {
    const { b, calls } = fake();
    const u = createUpdater(b, memory());
    await u.api.installOnExit();
    expect(calls).toEqual([]);
    await u.api.check();
    await u.api.installOnExit();
    expect(calls).toEqual(["check"]); // disponible pero sin descargar: no instala
    await u.api.download();
    await u.api.installOnExit();
    expect(calls[calls.length - 1]).toBe("install");
    expect(calls).not.toContain("relaunch");
  });
});

describe("«UPDATED TO» notice", () => {
  it("the very first run only records the version (no notice)", async () => {
    const store = memory();
    const u = createUpdater(fake().b, store);
    await u.api.detectUpdated();
    expect(u.getState().updated).toBeNull();
    expect(store.get("rabit.updater.lastSeenVersion")).toBe("1.2.0");
  });

  it("after an update it shows the new version with the notes that were downloaded, once", async () => {
    const store = memory();
    // versión vieja: descarga la actualización (se guardan sus notas)
    const old = createUpdater(fake().b, store);
    await old.api.detectUpdated();
    await old.api.check();
    await old.api.download();
    // la app «reinicia» ya en 1.3.0
    const fresh = createUpdater(fake({}, "1.3.0").b, store);
    await fresh.api.detectUpdated();
    expect(fresh.getState().updated).toEqual({ version: "1.3.0", notes: INFO.notes });
    fresh.api.dismissUpdated();
    expect(fresh.getState().updated).toBeNull();
    // otro arranque en la misma versión: no vuelve a salir
    const again = createUpdater(fake({}, "1.3.0").b, store);
    await again.api.detectUpdated();
    expect(again.getState().updated).toBeNull();
  });

  it("shows the notice without notes when the app was updated some other way", async () => {
    const store = memory();
    store.set("rabit.updater.lastSeenVersion", "1.0.0");
    const u = createUpdater(fake({}, "1.1.0").b, store);
    await u.api.detectUpdated();
    expect(u.getState().updated).toEqual({ version: "1.1.0", notes: [] });
  });
});

describe("helpers and simulation", () => {
  it("parseNotes strips bullets, headings and bold", () => {
    expect(parseNotes("## Release\n- **Savings** jars\n* Faster start\n\n1. Fixes")).toEqual(["Release", "Savings jars", "Faster start", "Fixes"]);
    expect(parseNotes(undefined)).toEqual([]);
  });

  it("parseNotes caps the number and the length of lines (the manifest is untrusted network text)", () => {
    const many = Array.from({ length: 50 }, (_, i) => `- note ${i}`).join("\n");
    expect(parseNotes(many)).toHaveLength(20);
    const long = parseNotes(`- ${"x".repeat(500)}`)[0];
    expect(long.length).toBe(160);
    expect(long.endsWith("…")).toBe(true);
  });

  it("nextMinor bumps the minor version", () => {
    expect(nextMinor("0.1.0")).toBe("0.2.0");
    expect(nextMinor("1.9.4")).toBe("1.10.0");
  });

  it("the simulation walks the whole flow: available → downloading → ready → 'restart' → UPDATED notice", async () => {
    const store = memory();
    let reloaded = 0;
    const sim = () => simBackend("0.1.0", store, { checkMs: 1, downloadMs: 20, reload: () => void reloaded++ });
    const u = createUpdater(sim(), store);
    await u.api.detectUpdated();
    await u.api.check();
    expect(u.getState()).toMatchObject({ status: "available", next: { version: "0.2.0" } });
    await u.api.download();
    expect(u.getState().status).toBe("ready");
    await u.api.restartNow();
    expect(reloaded).toBe(1);
    const after = createUpdater(sim(), store); // la página se recarga
    await after.api.detectUpdated();
    expect(after.getState().updated?.version).toBe("0.2.0");
    expect(after.getState().updated?.notes.length).toBeGreaterThan(0);
    await after.api.check();
    expect(after.getState().status).toBe("idle"); // ya está «instalada»
  });
});
