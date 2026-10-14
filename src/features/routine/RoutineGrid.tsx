/**
 * Routine: tarjeta de la semana (encabezado de días, cuadrícula por horas y bloques de rutina/calendario/tareas).
 */
import type { CSSProperties } from "react";
import { fmtTime, fromISO, fromMin } from "../../domain/dates";
import { t } from "../../i18n";
import type { ISODate, RoutineBlock } from "../../domain/types";
import { compactTime, layoutOverlap } from "../../domain/timegrid";
import { scaleOf } from "../../lib/zoom";
import { GLASS_CARD } from "../../components/ui/cardStyles";
import { MoreBadge } from "../../components/ui/MoreBadge";
import { ROW } from "../calendar/gridKit";
import { dayOfRoutine, dow3, groupOf, SILK, type Clash, type DaySettings, type RItem } from "./model";
import { Rule } from "./parts";

export interface RoutineGridProps {
  cols: { date: ISODate; list: RItem[]; clashes: Clash[] }[];
  today: ISODate;
  day: DaySettings;
  tf: "12h" | "24h";
  WAKE: number;
  BED: number;
  hourRows: { label: string; h: number }[];
  gridH: number;
  yOf: (min: number) => number;
  selGroup: RoutineBlock[];
  routine: RoutineBlock[];
  daysLabel: (blocks: RoutineBlock[]) => string;
  openDraftNew: (dayIdx?: number, startMin?: number) => void;
  setSelId: (id: string | null) => void;
  openPanel: (kind: "event" | "task", id: string) => void;
  onEditDay: () => void;
}

export function RoutineGrid({
  cols,
  today,
  day,
  tf,
  WAKE,
  BED,
  hourRows,
  gridH,
  yOf,
  selGroup,
  routine,
  daysLabel,
  openDraftNew,
  setSelId,
  openPanel,
  onEditDay,
}: RoutineGridProps): JSX.Element {
  return (
    <div style={{ ...GLASS_CARD, flex: 1, padding: "18px 20px 20px" }}>
      <div style={{ display: "flex", paddingLeft: 58, marginBottom: 8 }}>
        {cols.map(({ date }) => {
          const d = fromISO(date),
            isToday = date === today,
            wk = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={date}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "baseline",
                gap: 7,
                padding: "5px 9px",
                borderRadius: 9,
                background: isToday ? "rgba(215,244,229,.7)" : wk ? "rgba(18,38,30,.025)" : "transparent",
              }}
            >
              <div style={{ fontFamily: SILK, fontSize: 9, letterSpacing: ".08em", color: "var(--rb-muted)" }}>{dow3()[d.getDay()]}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? "var(--rb-green-deep)" : "#16211c" }}>{d.getDate()}</div>
              <div style={{ fontFamily: SILK, fontSize: 7.5, letterSpacing: ".06em", color: "var(--rb-green-deep)" }}>{isToday ? t("Today").toUpperCase() : ""}</div>
            </div>
          );
        })}
      </div>
      <Rule
        label={t("✦ WAKE UP {time}", { time: fmtTime(day.wake, tf) })}
        title={t("Set wake-up time")}
        color="#0b7a45"
        line="rgba(23,184,102,.35)"
        hover="rgba(23,184,102,.12)"
        padding="0 0 7px 58px"
        onClick={() => onEditDay()}
      />
      <div
        className="rb-scroll"
        style={{ position: "relative", maxHeight: 610, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "thin", scrollbarColor: "rgba(23,184,102,.45) transparent" }}
      >
        {hourRows.map((h, i) => (
          <div key={i} style={{ display: "flex", height: h.h, boxSizing: "border-box", borderTop: "1px solid rgba(18,38,30,.06)" }}>
            <div
              style={{
                width: 58,
                flex: "none",
                boxSizing: "border-box",
                paddingRight: 10,
                paddingTop: 3,
                textAlign: "right",
                fontSize: 10.5,
                lineHeight: "14px",
                color: "var(--rb-muted)",
                overflow: "hidden",
              }}
            >
              {h.label}
            </div>
            {cols.map(({ date }) => {
              const isToday = date === today,
                wk = [0, 6].includes(fromISO(date).getDay());
              return (
                <div
                  key={date}
                  style={{
                    flex: 1,
                    borderLeft: "1px solid rgba(18,38,30,.06)",
                    background: isToday ? "rgba(215,244,229,.16)" : wk ? "rgba(18,38,30,.015)" : "transparent",
                  }}
                />
              );
            })}
          </div>
        ))}
        <div style={{ borderTop: "1px solid rgba(18,38,30,.06)" }} />
        <div style={{ position: "absolute", left: 58, right: 0, top: 0, height: gridH, display: "flex" }}>
          {cols.map(({ date, list }) => {
            const laid = layoutOverlap(list.filter((b) => b.eM > WAKE && b.sM < BED));
            return (
              <div
                key={date}
                style={{ position: "relative", flex: 1, minWidth: 0, cursor: "pointer" }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const min = WAKE + ((e.clientY - rect.top) / scaleOf(e.currentTarget) / ROW) * 60;
                  openDraftNew(dayOfRoutine(date), Math.floor(min / 30) * 30);
                }}
              >
                {laid
                  .filter((b) => !b.hidden)
                  .map((b) => {
                    const isCal = b.kind !== "routine";
                    const hit = laid.filter((x) => !x.hidden).some((o) => o !== b && (o.kind === "routine") !== isCal && o.sM < b.eM && b.sM < o.eM);
                    const selc = !isCal && selGroup.some((g) => g.id === b.id);
                    const cs = Math.max(b.sM, WAKE),
                      ce = Math.min(b.eM, BED);
                    const top = yOf(cs),
                      h = Math.max(18, yOf(ce) - yOf(cs));
                    const GAP = 3;
                    const amber = isCal && hit && !selc;
                    const every = b.block?.everyWeeks ?? 1;
                    const rep = b.block
                      ? every > 1
                        ? `↻${every}`
                        : routine.some((x) => x.id !== b.id && groupOf(b.block as RoutineBlock, routine).some((g) => g.id === x.id))
                          ? "↻"
                          : ""
                      : "";
                    const hh = Math.max(24, h - GAP * 2);
                    const bg = amber
                      ? "linear-gradient(145deg,#fff3dc,#ffe2b8)"
                      : selc
                        ? "linear-gradient(145deg,#e6f8ee,#d3f1e1)"
                        : isCal
                          ? "linear-gradient(145deg,#ffffff,#f3f6f8)"
                          : "linear-gradient(145deg,#ffffff,#f5f8f6)";
                    const border = amber ? "#d9952a" : selc ? "rgba(23,184,102,.5)" : isCal ? `${b.color}66` : "rgba(255,255,255,.95)";
                    const shadow = amber
                      ? "inset 0 1px 1px #fff,0 0 0 3px rgba(217,149,42,.18),0 10px 18px -10px rgba(160,100,10,.55)"
                      : selc
                        ? "inset 0 1px 1px #fff,0 8px 18px -12px rgba(23,184,102,.8)"
                        : isCal
                          ? `inset 0 1px 1px #fff,inset 0 0 0 1px ${b.color}26,0 8px 16px -10px rgba(18,60,40,.45)`
                          : "inset 0 1px 1px #fff,0 4px 10px -7px rgba(20,48,34,.28)";
                    const pad = hh < 30 ? "0 8px" : b.n > 1 ? (hh < 40 ? "2px 4px" : "4px") : hh < 40 ? "2px 8px" : "6px 8px";
                    const style: CSSProperties = {
                      position: "absolute",
                      left: `calc(${(b.idx * 100) / b.n}% + ${GAP}px)`,
                      width: `calc(${100 / b.n}% - ${GAP * 2}px)`,
                      top: top + GAP,
                      height: hh,
                      padding: pad,
                      boxSizing: "border-box",
                      borderRadius: 12,
                      background: bg,
                      backdropFilter: "blur(14px) saturate(170%)",
                      WebkitBackdropFilter: "blur(14px) saturate(170%)",
                      border: `1px solid ${border}`,
                      borderLeft: `3px solid ${b.color}`,
                      boxShadow: shadow,
                      zIndex: isCal ? (hit ? 4 : 3) : 1,
                      opacity: !isCal && hit && !selc ? 0.42 : 1,
                      cursor: "pointer",
                      overflow: "hidden",
                    };
                    const label = `${b.kind === "task" ? "□ " : ""}${amber ? "! " : ""}${b.title}`;
                    const timeTxt = `${compactTime(fromMin(b.sM), tf)}–${compactTime(fromMin(b.eM % 1440), tf)}`;
                    return (
                      <div
                        key={b.key}
                        className="rbc-lift"
                        style={style}
                        title={`${b.title}  ${fmtTime(fromMin(b.sM), tf)}–${fmtTime(fromMin(b.eM % 1440), tf)}${isCal ? `\n${b.kind === "task" ? t("Calendar task") : t("Calendar event")}` : `\n${t("Routine · {days}", { days: daysLabel(b.block ? groupOf(b.block, routine) : []) })}`}${amber ? `\n${t("Clash · Calendar wins")}` : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (b.kind === "routine") setSelId(selc ? null : b.id);
                          else openPanel(b.kind, b.id);
                        }}
                      >
                        {b.more > 0 && <MoreBadge n={b.more} />}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                            height: "100%",
                            overflow: "hidden",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, minWidth: 0, maxWidth: "100%" }}>
                            <div
                              style={{
                                minWidth: 0,
                                fontSize: 10.5,
                                fontWeight: 700,
                                lineHeight: 1.15,
                                color: "var(--rb-ink)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {label}
                            </div>
                            {b.n === 1 && rep && <div style={{ fontFamily: SILK, fontSize: 7, color: "#0b7a45" }}>{rep}</div>}
                          </div>
                          {!((b.n > 1 && hh < 34) || hh < 30) && (
                            <div
                              style={{
                                fontSize: 9,
                                lineHeight: 1.15,
                                color: "var(--rb-muted)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "100%",
                              }}
                            >
                              {timeTxt}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
      <Rule
        label={t("☾ BEDTIME {time}", { time: fmtTime(day.bed, tf) })}
        title={t("Set bedtime")}
        color="#5d6f67"
        line="rgba(18,38,30,.16)"
        hover="rgba(18,38,30,.06)"
        padding="8px 0 0 58px"
        onClick={() => onEditDay()}
      />
    </div>
  );
}
