/**
 * Carrusel de frascos: una tarjeta (frasco con monedas, estado, plan, avance y botones de agregar/retirar/editar).
 */
import type { MutableRefObject } from "react";
import { coinsFor, lighten, money, perOf, shortDate } from "../../domain/savings";
import { t } from "../../i18n";
import { Jar, type Sway } from "./Jar";
import type { JarCard } from "./JarCarousel";
import { ease } from "./useCarouselPhysics";

interface Props {
  card: JarCard;
  lift: { id: string; armed: boolean } | null;
  dropId: string | null;
  sparks: Record<string, number>;
  sway: MutableRefObject<Sway>;
  reduced: boolean;
  cardBasis: string;
  onAdd: (id: string) => void;
  onWithdraw: (id: string) => void;
  onEdit: (id: string) => void;
}

export function JarSlide({ card: { goal: g, plan: pl, msg, sub, msgColor }, lift, dropId, sparks, sway, reduced, cardBasis, onAdd, onWithdraw, onEdit }: Props) {
  return (
    <div key={g.id} data-card={g.id} style={{ flex: `0 0 ${cardBasis}`, display: "flex", position: "relative" }}>
      {lift?.id === g.id && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: -46,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 7,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            borderRadius: 999,
            whiteSpace: "nowrap",
            fontSize: 12.5,
            fontWeight: 700,
            color: "#fff",
            background: lift.armed ? "var(--rb-danger)" : "linear-gradient(150deg,rgba(14,26,20,.92),rgba(18,40,30,.86))",
            boxShadow: "0 12px 24px -12px rgba(12,30,22,.7)",
            transition: "background .2s ease",
            pointerEvents: "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5 5 13h6l.5-8.5" />
          </svg>
          {lift.armed ? t("Release to delete") : t("Pull up to delete")}
        </div>
      )}
      <div
        className="rb-jar-shell"
        style={{
          flex: 1,
          minWidth: 0,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          padding: 14,
          borderRadius: 32,
          background: pl.done ? "linear-gradient(145deg,rgba(214,246,226,.85),rgba(190,236,207,.5))" : "linear-gradient(145deg,rgba(255,255,255,.72),rgba(255,255,255,.38))",
          backdropFilter: "blur(24px) saturate(170%)",
          border: "1px solid rgba(255,255,255,.8)",
          boxShadow: "inset 0 1px 1px #fff,inset 0 -10px 24px -18px rgba(255,255,255,.8),0 24px 48px -30px rgba(20,48,34,.32)",
          transition: `transform .5s ${ease},box-shadow .5s ${ease}`,
        }}
      >
        <div style={{ position: "relative", height: 226, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 18 }}>
          <Jar color={g.color} coins={coinsFor(g)} drop={g.id === dropId} sparkToken={sparks[g.id] ?? 0} sway={sway} reduced={reduced} />
        </div>
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "20px 20px 18px",
            borderRadius: 24,
            background: pl.done ? "linear-gradient(160deg,#effbf3,#ddf5e6)" : "#fff",
            transition: "background .6s ease",
            boxShadow: "0 1px 2px rgba(20,48,34,.06),0 16px 30px -22px rgba(20,48,34,.4)",
          }}
        >
          {g.important && !pl.done && (
            <div
              title={t("Important")}
              style={{
                position: "absolute",
                left: 14,
                top: 14,
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "rgba(224,144,42,.14)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="#e0902a" aria-hidden="true">
                <path d="M8 1.6l1.95 4 4.4.6-3.2 3.1.78 4.4L8 11.6l-3.93 2.1.78-4.4L1.65 6.2l4.4-.6Z" />
              </svg>
            </div>
          )}
          <button
            type="button"
            aria-label={t("Edit goal")}
            title={t("Edit goal")}
            className="rb-hover-bg"
            onClick={() => onEdit(g.id)}
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              width: 30,
              height: 30,
              padding: 0,
              border: 0,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              background: "transparent",
              color: "#8b9a93",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5V10.5Z" />
            </svg>
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px",
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 600,
              color: "#fff",
              background: pl.done ? "var(--rb-green-grad)" : "linear-gradient(150deg,#f0a23c,#e0902a)",
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(255,255,255,.3)" }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff" }} />
            </div>
            {pl.done ? t("Completed") : t("In progress")}
          </div>
          <div
            style={{
              fontSize: 21,
              fontWeight: 700,
              letterSpacing: "-.02em",
              color: "var(--rb-ink)",
              marginTop: 12,
              maxWidth: "100%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {g.name}
          </div>
          <div style={{ fontSize: 11.5, color: "#8b9a93", marginTop: 3 }}>
            {pl.done
              ? t("Amount saved")
              : pl.free
                ? t("Amount needed")
                : g.deadline
                  ? t("Save {amt} until {date}", { amt: `${money(pl.now)}${perOf(g.freq)}`, date: shortDate(g.deadline) })
                  : t("Plan: {amt}", { amt: `${money(pl.now)}${perOf(g.freq)}` })}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 2 }}>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.03em", color: "var(--rb-ink)" }}>{money(g.saved)}</div>
            {!pl.done && <div style={{ fontSize: 20, fontWeight: 700, color: "#b3beb9" }}>{`/${Math.round(g.target).toLocaleString("en-US")}`}</div>}
          </div>
          <div style={{ width: "100%", height: 8, borderRadius: 4, background: lighten(g.color, 0.85), overflow: "hidden", marginTop: 12 }}>
            <div
              style={{
                width: `${Math.min(100, g.target ? (g.saved / g.target) * 100 : 0)}%`,
                height: "100%",
                borderRadius: 4,
                background: g.color,
                transition: `width 1.4s ${ease}`,
              }}
            />
          </div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 3, marginTop: 12, minHeight: 34 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: msgColor }}>{msg}</div>
            <div style={{ fontSize: 11.5, color: "#8b9a93" }}>{sub}</div>
          </div>
          <div style={{ width: "100%", display: "flex", gap: 8, marginTop: 14 }}>
            <button
              type="button"
              className="rb-hover-scale"
              onClick={() => onAdd(g.id)}
              style={{
                flex: 1,
                padding: 13,
                border: 0,
                borderRadius: 14,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13.5,
                fontWeight: 600,
                color: "#fff",
                background: "linear-gradient(150deg,#26342d,#18221d)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.1),0 8px 14px -10px rgba(12,24,18,.65)",
              }}
            >
              {t("Add money")}
            </button>
            <button
              type="button"
              aria-label={t("Withdraw")}
              title={t("Withdraw")}
              className="rb-hover-bg"
              onClick={() => onWithdraw(g.id)}
              style={{
                width: 46,
                flex: "none",
                padding: 0,
                border: 0,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "var(--rb-muted)",
                background: "rgba(18,38,30,.05)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 3.5v9M4 8.5l4 4 4-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
