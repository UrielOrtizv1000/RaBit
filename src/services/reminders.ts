/**
 * Scheduler local de recordatorios (sin servidor): programa un único `setTimeout` para el próximo aviso y se
 * reprograma al cambiar eventos/ajustes y al arrancar. Notificación nativa en Tauri, Notification API en navegador.
 */
import { DAY_MS, type CalEvent } from "../domain/types";
import { remindAt } from "../domain/logic";
import { useData } from "../store/data";
import { useUi } from "../store/ui";
import { isTauri } from "./boot";
import { t } from "../i18n";
import { logWarn } from "../lib/log";

const LS = "rabit.reminders.fired";

type Fired = Record<string, number>;
const loadFired = (): Fired => {
  try {
    return JSON.parse(localStorage.getItem(LS) ?? "{}") as Fired;
  } catch (e) {
    logWarn("reminders.load", e);
    return {};
  }
};
const saveFired = (f: Fired) => {
  try {
    localStorage.setItem(LS, JSON.stringify(f));
  } catch (e) {
    logWarn("reminders.save", e);
  }
};

/** Próximo instante pendiente para un evento: "once" una vez; "daily" cada día hasta el inicio. */
export function nextFire(e: CalEvent, now: number, fired: Fired): number | null {
  const first = remindAt(e);
  if (first === null || !e.remind) return null;
  const [y, m, d] = e.date.split("-").map(Number);
  const [h, mi] = (e.allDay ? "09:00" : e.start).split(":").map(Number);
  const start = new Date(y, m - 1, d, h, mi).getTime();
  const last = fired[e.id] ?? 0;
  const slots =
    e.remind.freq === "daily" ? Array.from({ length: Math.max(1, Math.ceil((start - first) / DAY_MS) + 1) }, (_, i) => first + i * DAY_MS).filter((t) => t <= start) : [first];
  return slots.find((t) => t > last && t > now - DAY_MS) ?? null;
}

async function notify(title: string, body: string, sound: boolean) {
  useUi.getState().showToast(`${title} · ${body}`);
  try {
    if (isTauri()) {
      const n = await import("@tauri-apps/plugin-notification");
      let ok = await n.isPermissionGranted();
      if (!ok) ok = (await n.requestPermission()) === "granted";
      if (ok) n.sendNotification({ title, body });
    } else if ("Notification" in window) {
      if (Notification.permission === "default") await Notification.requestPermission();
      if (Notification.permission === "granted") new Notification(title, { body });
    }
  } catch (e) {
    logWarn("reminders.notify", e); /* sin permiso: el toast ya avisó */
  }
  if (sound) beep();
}

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = 880;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.12);
    setTimeout(() => void ctx.close(), 300);
  } catch (e) {
    logWarn("reminders.beep", e);
  }
}

/** Scheduler local: reprograma al arrancar y cuando cambian los eventos. Sin servidor. */
export function startReminders(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const plan = () => {
    clearTimeout(timer);
    const { events, settings } = useData.getState();
    if (!settings.reminders) return;
    const now = Date.now(),
      fired = loadFired();
    let best: { at: number; ev: CalEvent } | null = null;
    for (const ev of events) {
      const at = nextFire(ev, now, fired);
      if (at !== null && (!best || at < best.at)) best = { at, ev };
    }
    if (!best) return;
    const { at, ev } = best;
    timer = setTimeout(
      () => {
        const f = loadFired();
        f[ev.id] = at;
        saveFired(f);
        void notify(ev.title, ev.allDay ? t("{date} · all day", { date: ev.date }) : `${ev.date} · ${ev.start}`, useData.getState().settings.sound);
        plan();
      },
      Math.min(Math.max(0, at - now), 2_147_000_000),
    );
  };
  plan();
  const unsub = useData.subscribe((s, p) => {
    if (s.events !== p.events || s.settings !== p.settings) plan();
  });
  return () => {
    clearTimeout(timer);
    unsub();
  };
}
