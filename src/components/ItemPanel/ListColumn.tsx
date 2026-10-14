/**
 * Columna izquierda del panel: pestañas de tipo, botón de crear, titular, búsqueda, filtros, la lista agrupada y el borrado en bloque.
 */
import { t } from "../../i18n";
import type { PanelKind } from "../../store/ui";
import type { Group } from "./lists";
import { kindOptions, type Sel } from "./panelModel";
import { RowView } from "./RowView";
import { EASE, FAINT, greenGrad, Ico, INK, Pill, RED, Seg, silk } from "./ui";

export interface ListColumnProps {
  inline: boolean;
  listHidden: boolean;
  kind: PanelKind;
  pickKind: (k: PanelKind) => void;
  startNew: () => void;
  labels: { newLabel: string; search: string; bulk: string };
  headline: string;
  localQ: string;
  setLocalQ: (q: string) => void;
  filter: string;
  setFilter: (f: string) => void;
  filterOptions: (readonly [string, string])[];
  groups: Group[];
  hasQuery: boolean;
  sel: Sel;
  leaving: ReadonlySet<string>;
  select: (id: string) => void;
  toggleTask: (id: string) => void;
  showBulk: boolean;
  bulk: () => void;
  bulkCount: number;
}

export function ListColumn(p: ListColumnProps) {
  const {
    inline,
    listHidden,
    kind,
    pickKind,
    startNew,
    labels: L,
    headline,
    localQ,
    setLocalQ,
    filter,
    setFilter,
    filterOptions,
    groups,
    hasQuery,
    sel,
    leaving,
    select,
    toggleTask,
    showBulk,
    bulk,
    bulkCount,
  } = p;
  return (
    <div
      style={{
        width: listHidden ? 0 : 380,
        opacity: listHidden ? 0 : 1,
        flex: "none",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${listHidden ? "transparent" : "rgba(18,38,30,.07)"}`,
        background: "rgba(255,255,255,.35)",
        visibility: listHidden ? "hidden" : "visible",
        transition: `width .6s ${EASE},opacity .4s ease,border-color .4s ease,visibility 0s linear ${listHidden ? ".6s" : "0s"}`,
      }}
    >
      <div style={{ width: 380, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "20px 22px 14px" }}>
          {inline ? (
            <div style={silk(10, ".16em")}>{t("YOUR NOTES")}</div>
          ) : (
            <div data-tour="panel-tabs">
              <Seg<PanelKind>
                role="tablist"
                label={t("Item type")}
                options={kindOptions()}
                value={kind}
                onChange={pickKind}
                size={9.5}
                pad="7px 10px"
                font={{ fontFamily: "Silkscreen,monospace", letterSpacing: ".07em", fontWeight: 400 }}
                stretch={false}
              />
            </div>
          )}
          <div data-tour="panel-new" style={{ flex: "none" }}>
            <Pill
              onClick={startNew}
              className="ip-h-scale"
              style={{
                padding: "9px 13px",
                whiteSpace: "nowrap",
                color: "#fff",
                background: greenGrad,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.35),0 10px 20px -12px rgba(23,184,102,.95)",
                flex: "none",
              }}
            >
              {Ico.plus()}
              {L.newLabel}
            </Pill>
          </div>
        </div>
        <div style={{ padding: "0 22px 4px", fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: INK }} aria-live="polite">
          {headline}
        </div>
        <div style={{ padding: "10px 22px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          <label
            data-tour="panel-search"
            className="ip-focus-within"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "10px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,.8)",
              boxShadow: "inset 0 1px 1px #fff,0 6px 14px -10px rgba(20,48,34,.35)",
              transition: "box-shadow .25s ease",
            }}
          >
            {Ico.search}
            <input
              aria-label={L.search}
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder={L.search}
              style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", fontFamily: "inherit", fontSize: 13, color: INK }}
            />
          </label>
          <Seg label={t("Filter")} options={filterOptions} value={filter} onChange={setFilter} pad="7px 0" />
        </div>

        <div className="rb-noscroll" style={{ flex: 1, minHeight: 0, padding: "0 14px 16px" }}>
          {groups.map((g) => (
            <section key={g.label} aria-label={t(g.label)}>
              <div style={{ ...silk(9, ".14em", g.color), padding: "12px 10px 6px" }}>{t(g.label)}</div>
              {g.rows.map((r) => (
                <RowView key={r.id} row={r} selected={sel?.id === r.id} leaving={leaving.has(r.id)} onSelect={() => select(r.id)} onToggle={() => toggleTask(r.id)} />
              ))}
            </section>
          ))}
          {groups.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 13, color: FAINT }}>{hasQuery ? t("No matches.") : t("Nothing here yet.")}</div>
          )}
        </div>

        {showBulk && (
          <div style={{ flex: "none", padding: "12px 22px 18px", borderTop: "1px solid rgba(18,38,30,.07)", animation: `rb-toast .35s ${EASE} both` }}>
            <Pill
              onClick={bulk}
              className="ip-h-red2"
              style={{ width: "100%", justifyContent: "center", gap: 8, padding: "10px 14px", color: RED, background: "rgba(192,74,66,.06)" }}
            >
              {Ico.trash()}
              {L.bulk} · {bulkCount}
            </Pill>
          </div>
        )}
      </div>
    </div>
  );
}
