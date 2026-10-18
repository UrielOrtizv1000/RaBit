/**
 * Primer arranque: nombre (modo local) y elección de módulos. Incluye selector de idioma.
 * Cuando termina escribe usuario + ajustes en la base de datos.
 */
import { useEffect, useState } from "react";
import { useData } from "../../store/data";
import type { Modules } from "../../domain/types";
import { t } from "../../i18n";
import { OnboardingForm } from "./OnboardingForm";
import { OnboardingPanel } from "./OnboardingPanel";
import { IDS } from "./model";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const complete = useData((s) => s.completeOnboarding);
  const [phase, setPhase] = useState<"form" | "onboard">("form");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [mods, setMods] = useState<Modules>({ calendar: true, routine: true, notes: true, savings: true });
  const ob = phase === "onboard";
  const count = IDS.filter((i) => mods[i]).length;

  const submit = () => {
    if (!name.trim()) {
      setError(t("Tell RaBit your name to continue."));
      setTouched(true);
      return;
    }
    setError("");
    setPhase("onboard");
  };
  const finish = async () => {
    await complete(name, mods);
    onDone();
  };

  useEffect(() => {
    if (!ob) return;
    const kd = (e: KeyboardEvent) => {
      const k = ["1", "2", "3", "4"].indexOf(e.key);
      if (k >= 0) setMods((p) => ({ ...p, [IDS[k]]: !p[IDS[k]] }));
      else if (e.key === "Enter") void finish();
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  });

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "rgba(245,248,246,var(--glass-a))", display: "flex" }}>
      <OnboardingForm ob={ob} name={name} setName={setName} error={error} setError={setError} touched={touched} submit={submit} />

      <OnboardingPanel ob={ob} name={name} mods={mods} setMods={setMods} count={count} finish={finish} setPhase={setPhase} />
    </div>
  );
}
