/**
 * Inicio: tarjeta «Tareas pendientes» (lista con casilla, tachado animado, borrar completadas y deslizar para eliminar).
 */
import type { MouseEvent, RefObject } from "react";
import { fmtTime, relDay } from "../../domain/dates";
import type { ISODate, Task } from "../../domain/types";
import { swipeProps } from "../../lib/swipe";
import { t } from "../../i18n";
import { cardBase, cardHover, circleBtn, EASE, Hv, label10, Plus } from "./parts";

export interface TasksCardProps {
  orderedTasks: Task[];
  listRef: RefObject<HTMLDivElement>;
  today: ISODate;
  tf: "12h" | "24h";
  doneCount: number;
  openCount: number;
  planeAdding: boolean;
  deleteDoneTasks: () => Promise<void>;
  onToggle: (tk: Task) => (e: MouseEvent) => void;
  openPanel: (kind: "event" | "task" | "note", id: string | null) => void;
}

export function TasksCard({ orderedTasks, listRef, today, tf, doneCount, openCount, planeAdding, deleteDoneTasks, onToggle, openPanel }: TasksCardProps) {
  return (
    <Hv
      hover={cardHover}
      style={{
        ...cardBase,
        flex: 1,
        minWidth: 0,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "rb-rise .45s ease-out .2s both",
      }}
    >
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={label10}>{t("PENDING TASKS")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {doneCount > 0 && (
            <Hv
              onClick={() => {
                void deleteDoneTasks();
              }}
              hover={{ background: "rgba(18,38,30,.08)", color: "var(--rb-danger)" }}
              style={{
                cursor: "pointer",
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--rb-muted)",
                padding: "5px 11px",
                borderRadius: 999,
                background: "rgba(18,38,30,.05)",
                transition: "background .2s ease-out,color .2s ease-out",
              }}
            >
              {t("Delete done tasks")}
            </Hv>
          )}
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--rb-green-deep)", padding: "5px 11px", borderRadius: 999, background: "rgba(23,184,102,.12)" }}>
            {t("{n} open", { n: openCount })}
          </div>
          <Hv onClick={() => openPanel("task", null)} title={t("New task")} hover={{ transform: "scale(1.08)" }} style={circleBtn}>
            <Plus color="#0b7a45" style={{ transform: `rotate(${planeAdding ? 45 : 0}deg)`, transition: `transform .5s ${EASE}` }} />
          </Hv>
        </div>
      </div>
      <div ref={listRef} className="rb-noscroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", margin: "0 -12px", padding: "0 12px 4px", scrollbarWidth: "none" }}>
        {orderedTasks.length === 0 && (
          <div style={{ padding: "26px 14px", borderRadius: 18, border: "1px dashed rgba(18,38,30,.14)", fontSize: 13, color: "var(--rb-muted)", textAlign: "center" }}>
            {t("Nothing to do.")}{" "}
            <span onClick={() => openPanel("task", null)} style={{ color: "var(--rb-green-deep)", fontWeight: 600, cursor: "pointer" }}>
              {t("Add a task")}
            </span>
          </div>
        )}
        {orderedTasks.map((tk) => {
          const done = tk.done;
          const due = `${relDay(tk.date, today)}${tk.time ? ` · ${fmtTime(tk.time, tf)}` : ""}`;
          return (
            <Hv
              key={tk.id}
              tid={tk.id}
              swipe={swipeProps({ kind: "task", id: tk.id, title: tk.title })}
              onClick={() => openPanel("task", tk.id)}
              hover={{ background: "rgba(255,255,255,.7)" }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "11px 14px",
                margin: "0 -10px",
                borderRadius: 18,
                cursor: "pointer",
                opacity: done ? 0.55 : 1,
                transition: "opacity .3s ease-out,background .2s ease-out",
              }}
            >
              <div
                role="checkbox"
                aria-checked={done}
                aria-label={t("Complete task")}
                onClick={onToggle(tk)}
                style={{
                  width: 22,
                  height: 22,
                  flex: "none",
                  boxSizing: "border-box",
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  border: `1.6px solid ${done ? "transparent" : "rgba(18,38,30,.16)"}`,
                  background: done ? "var(--rb-green-grad)" : "rgba(255,255,255,.75)",
                  boxShadow: done ? "0 0 0 4px rgba(23,184,102,.14)" : "inset 0 1px 1px #fff",
                  transition: "background .15s ease-out,border-color .15s ease-out,box-shadow .25s ease-out",
                }}
              >
                {done && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ animation: "rb-tick .22s ease-out both" }}
                  >
                    <path d="M2.4 6.2 4.8 8.6 9.6 3.6" strokeDasharray="14" style={{ animation: "rb-draw .2s ease-out .05s both" }} />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    position: "relative",
                    display: "inline-block",
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    verticalAlign: "top",
                    fontSize: 14.5,
                    fontWeight: 500,
                    color: done ? "#8f9d97" : "var(--rb-ink)",
                    transition: "color .35s ease",
                  }}
                >
                  {tk.title || t("Untitled task")}
                  <div
                    style={{
                      position: "absolute",
                      left: -2,
                      top: "52%",
                      height: 1.6,
                      borderRadius: 2,
                      background: "#8f9d97",
                      width: done ? "calc(100% + 4px)" : "0%",
                      transition: `width .4s ${EASE}`,
                    }}
                  />
                </div>
                {tk.description.trim() && (
                  <div style={{ fontSize: 12, color: "#8b9a93", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tk.description}</div>
                )}
              </div>
              {tk.important && !done && (
                <div style={{ flex: "none", padding: "3px 8px", borderRadius: 999, background: "rgba(192,74,66,.1)", fontSize: 11, fontWeight: 700, color: "var(--rb-danger)" }}>
                  !
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--rb-faint)", flex: "none" }}>{due}</div>
            </Hv>
          );
        })}
      </div>
    </Hv>
  );
}
