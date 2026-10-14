/**
 * Inicio: sección «Notas rápidas» (hasta tres notas recientes o fijadas).
 */
import type { ISODate, Note, Tag } from "../../domain/types";
import { swipeProps } from "../../lib/swipe";
import { t } from "../../i18n";
import { NoteCard } from "./NoteCard";
import { Hv, label10, Plus } from "./parts";

export interface QuickNotesProps {
  quickNotes: Note[];
  tags: Tag[];
  nowMs: number;
  today: ISODate;
  openPanel: (kind: "event" | "task" | "note", id: string | null, preset?: { date: string }) => void;
}

export function QuickNotes({ quickNotes, tags, nowMs, today, openPanel }: QuickNotesProps) {
  return (
    <div style={{ flex: "none", animation: "rb-rise .45s ease-out .25s both" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 4px 10px" }}>
        <div style={label10}>{t("QUICK NOTES")}</div>
        <Hv
          onClick={() => openPanel("note", null)}
          hover={{ transform: "scale(1.03)" }}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 14px",
            borderRadius: 999,
            background: "linear-gradient(145deg,rgba(255,255,255,.8),rgba(255,255,255,.46))",
            border: "1px solid rgba(255,255,255,.9)",
            boxShadow: "inset 0 1px 1px #fff",
            fontSize: 12,
            fontWeight: 600,
            color: "#1d2a24",
          }}
        >
          <Plus color="#17b866" size={11} />
          {t("New note")}
        </Hv>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16 }}>
        {quickNotes.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "22px 14px",
              borderRadius: 26,
              border: "1px dashed rgba(18,38,30,.14)",
              fontSize: 13,
              color: "var(--rb-muted)",
              textAlign: "center",
            }}
          >
            {t("No notes yet.")}{" "}
            <span onClick={() => openPanel("note", null)} style={{ color: "var(--rb-green-deep)", fontWeight: 600, cursor: "pointer" }}>
              {t("Jot something down")}
            </span>
          </div>
        )}
        {quickNotes.slice(0, 3).map((n) => (
          <NoteCard
            key={n.id}
            swipe={swipeProps({ kind: "note", id: n.id, title: n.title })}
            n={n}
            tagName={tags.find((x) => x.id === n.tagId)?.name}
            tagColor={tags.find((x) => x.id === n.tagId)?.color}
            nowMs={nowMs}
            onOpen={() => openPanel("note", n.id)}
            onCal={(e) => {
              e.stopPropagation();
              openPanel("task", null, { date: today });
            }}
          />
        ))}
      </div>
    </div>
  );
}
