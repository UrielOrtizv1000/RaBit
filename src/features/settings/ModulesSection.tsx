/**
 * Ajustes › Módulos: activar o desactivar cada módulo (la página de inicio siempre queda).
 */
import type { Modules } from "../../domain/types";
import { silk } from "../../components/ui/glass";
import { t } from "../../i18n";
import { MODS, navOf, row, Switch } from "./settingsParts";

export function ModulesSection({ modules, setMods }: { modules: Modules; setMods: (m: Modules) => void }) {
  const on = MODS.filter((m) => modules[m.id]).length;
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 0 8px" }}>
        <div style={silk(9.5, { letterSpacing: ".16em", color: "var(--rb-faint)" })}>{t("MODULES · {on}/4 ON", { on })}</div>
        <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 999, background: "rgba(18,38,30,.05)" }}>
          <button
            onClick={() => setMods({ calendar: true, routine: true, notes: true, savings: true })}
            style={{
              padding: "5px 11px",
              border: 0,
              background: "transparent",
              borderRadius: 999,
              fontFamily: "inherit",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--rb-green-deep)",
            }}
          >
            {t("All on")}
          </button>
          <button
            onClick={() => setMods({ calendar: false, routine: false, notes: false, savings: false })}
            style={{
              padding: "5px 11px",
              border: 0,
              background: "transparent",
              borderRadius: 999,
              fontFamily: "inherit",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--rb-muted)",
            }}
          >
            {t("All off")}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {MODS.map((m) => {
          const nv = navOf(m.id),
            a = modules[m.id];
          return (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => setMods({ ...modules, [m.id]: !a })}
              onKeyDown={(e) => e.key === "Enter" && setMods({ ...modules, [m.id]: !a })}
              style={{ ...row, cursor: "pointer", opacity: a ? 1 : 0.72, transition: "opacity .2s ease-out" }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  flex: "none",
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: a ? "rgba(23,184,102,.14)" : "rgba(18,38,30,.06)",
                  boxShadow: "inset 0 1px 1px #fff",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={a ? "#0b7a45" : "#8b9a93"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d={nv.d} />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--rb-ink)" }}>
                  {t(nv.label)}
                  {m.beta && (
                    <span style={{ ...silk(8, { letterSpacing: ".1em", color: "#9a6a14" }), padding: "3px 7px", borderRadius: 6, background: "rgba(201,138,30,.14)" }}>
                      {t("STILL IN BETA")}
                    </span>
                  )}
                  {m.soon && (
                    <span style={{ ...silk(8, { letterSpacing: ".1em", color: "#9a6a14" }), padding: "3px 7px", borderRadius: 6, background: "rgba(201,138,30,.14)" }}>
                      {t("SOON")}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--rb-muted)", marginTop: 3, lineHeight: 1.45 }}>{t(m.desc)}</div>
              </div>
              <Switch on={a} label={t(nv.label)} onClick={() => setMods({ ...modules, [m.id]: !a })} />
            </div>
          );
        })}
        <div style={{ padding: "4px 4px 0", fontSize: 11.5, lineHeight: 1.5, color: "var(--rb-faint)" }}>
          {t("Home always stays on. Turned-off modules disappear from the sidebar and Home — your data is kept.")}
        </div>
      </div>
    </>
  );
}
