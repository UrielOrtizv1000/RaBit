/**
 * Inicio: tarjeta de una nota rápida (etiqueta, título, resumen y «Agregar al calendario»).
 */
import type { MouseEvent } from "react";
import type { SwipeProps } from "../../lib/swipe";
import type { Note } from "../../domain/types";
import { t } from "../../i18n";
import { ago } from "./model";
import { Hv, Plus } from "./parts";

export interface NoteCardProps {
  n: Note;
  tagName?: string;
  tagColor?: string;
  nowMs: number;
  swipe?: SwipeProps;
  onOpen: () => void;
  onCal: (e: MouseEvent<HTMLElement>) => void;
}

export function NoteCard({ n, tagName, tagColor, nowMs, onOpen, onCal, swipe }: NoteCardProps) {
  const color = tagColor ?? "#17b866";
  return (
    <Hv
      swipe={swipe}
      onClick={onOpen}
      hover={{ transform: "translateY(-3px)", boxShadow: "inset 0 1px 1px #fff,0 28px 48px -26px rgba(20,48,34,.38)" }}
      style={{
        cursor: "pointer",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: "20px 22px 16px",
        borderRadius: 26,
        background: "linear-gradient(145deg,rgba(255,255,255,.74),rgba(255,255,255,.38))",
        backdropFilter: "blur(24px) saturate(170%)",
        WebkitBackdropFilter: "blur(24px) saturate(170%)",
        border: "1px solid rgba(255,255,255,.85)",
        boxShadow: "inset 0 1px 1px #fff,0 24px 48px -30px rgba(20,48,34,.3)",
        transition: "transform .2s ease-out,box-shadow .2s ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color, padding: "4px 10px", borderRadius: 999, background: `${color}1f` }}>{tagName ?? t("Note")}</div>
        <div style={{ fontSize: 11.5, color: "#8b9a93" }}>{ago(n.updatedAt, nowMs)}</div>
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "-.01em",
          color: "var(--rb-ink)",
          marginBottom: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {n.title || t("Untitled note")}
      </div>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--rb-muted)",
          minHeight: 42,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {n.body}
      </div>
      <Hv
        onClick={onCal}
        hover={{ opacity: 0.75 }}
        style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "var(--rb-green-deep)", alignSelf: "flex-start" }}
      >
        <Plus color="#17b866" size={11} />
        {t("Add to calendar")}
      </Hv>
    </Hv>
  );
}
