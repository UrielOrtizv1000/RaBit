/**
 * Raíz de la aplicación: arranca la base de datos, aplica tema/idioma/cristal, decide entre onboarding y shell,
 * monta la página activa dentro de <FitPage> y los overlays globales (panel, ajustes, toasts).
 *
 * Por qué el `key={language}`: al cambiar de idioma se vuelve a montar todo el árbol, así ningún componente
 * conserva textos del idioma anterior (evita tener que suscribir cada componente al idioma).
 */
import { useEffect, useState } from "react";
import { TitleBar } from "./TitleBar";
import { Topbar } from "./Topbar";
import { Dock } from "./Dock";
import { useUi, type PageId } from "../store/ui";
import { useData } from "../store/data";
import { boot } from "../services/boot";
import { startReminders } from "../services/reminders";
import { HomePage } from "../features/home/HomePage";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { RoutinePage } from "../features/routine/RoutinePage";
import { NotesPage } from "../features/notes/NotesPage";
import { SavingsPage } from "../features/savings/SavingsPage";
import { SettingsModal } from "../features/settings/SettingsModal";
import { Onboarding } from "../features/onboarding/Onboarding";
import { ItemPanel } from "../components/ItemPanel/ItemPanel";
import { Toaster } from "../components/Toaster";
import { useTheme } from "./useTheme";
import { setLang, t } from "../i18n";
import { applyGlass } from "../services/glass";
import { FitPage } from "./FitPage";

const PAGES: Record<PageId, () => JSX.Element> = {
  home: HomePage,
  calendar: CalendarPage,
  routine: RoutinePage,
  notes: NotesPage,
  savings: SavingsPage,
};

export function App() {
  const { page, panel, setPage, openPanel, closePanel, openSettings } = useUi();
  useTheme();
  const language = useData((s) => s.settings.language);
  const glass = useData((s) => s.settings.glass);
  useEffect(() => {
    void applyGlass(glass);
  }, [glass]);
  setLang(language); // síncrono: los hijos ya renderizan en el idioma elegido
  const ready = useData((s) => s.ready);
  const user = useData((s) => s.user);
  const modules = useData((s) => s.settings.modules);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    boot().catch((e: unknown) => setErr(String(e)));
  }, []);
  useEffect(() => (ready ? startReminders() : undefined), [ready]);

  // Atajos: Ctrl/Cmd+N crea en la pestaña activa, Esc cierra, Ctrl/Cmd+K enfoca la búsqueda.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        if (useUi.getState().settingsOpen) openSettings(false);
        else closePanel();
      } else if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("rb-search")?.focus();
      } else if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        const cur = useUi.getState().panel;
        if (page === "notes" && !cur) return;
        openPanel(cur?.kind ?? (page === "calendar" ? "event" : "task"), null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, openPanel, closePanel, openSettings]);

  // Si el módulo de la página actual se apaga, vuelve a Home.
  useEffect(() => {
    const m = page === "home" ? true : modules[page];
    if (!m) setPage("home");
  }, [page, modules, setPage]);

  const Page = PAGES[page];
  const needsOnboarding = ready && !user?.onboardingDone;

  return (
    <div
      key={language}
      className={needsOnboarding || !ready ? undefined : "rb-themed"}
      style={{ height: "100%", display: "flex", flexDirection: "column", background: "rgba(233,238,235,var(--glass-a))" }}
    >
      <TitleBar />
      {err && (
        <div role="alert" style={{ padding: 12, color: "#a8443a" }}>
          {t("Could not open the database: {err}", { err })}
        </div>
      )}
      {!ready ? null : needsOnboarding ? (
        <div style={{ flex: 1, minHeight: 0 }}>
          <Onboarding onDone={() => undefined} />
        </div>
      ) : (
        <div
          style={{
            position: "relative",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            background: "linear-gradient(160deg,rgba(241,244,242,var(--glass-a)) 0%,rgba(230,235,232,var(--glass-a)) 100%)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7)",
          }}
        >
          {/* color ambiente detrás del vidrio */}
          <div
            className="rb-ambient"
            style={{
              position: "absolute",
              left: -120,
              top: -140,
              width: 620,
              height: 520,
              borderRadius: "50%",
              background: "rgba(122,221,159,.55)",
              filter: "blur(90px)",
              animation: "rb-drift 18s ease-in-out infinite",
            }}
          />
          <div
            className="rb-ambient"
            style={{ position: "absolute", right: -160, top: 120, width: 560, height: 520, borderRadius: "50%", background: "rgba(168,205,236,.5)", filter: "blur(100px)" }}
          />
          <div
            className="rb-ambient"
            style={{ position: "absolute", left: 420, bottom: -220, width: 640, height: 460, borderRadius: "50%", background: "rgba(246,214,182,.45)", filter: "blur(110px)" }}
          />

          <div
            style={{
              position: "relative",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              background: "linear-gradient(160deg,rgba(255,255,255,.42),rgba(255,255,255,.2))",
            }}
          >
            <Topbar onSettings={() => openSettings(true)} />
            <div style={{ flex: 1, minHeight: 0, display: "flex", padding: "14px 0 0" }}>
              <Dock />
              <FitPage pageKey={page}>
                {ready && (
                  <div key={page} className="rb-page" style={{ height: "100%" }}>
                    <Page />
                  </div>
                )}
              </FitPage>
            </div>
          </div>
          {panel && <ItemPanel />}
          <SettingsModal />
          <Toaster />
        </div>
      )}
    </div>
  );
}
