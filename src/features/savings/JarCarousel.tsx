/**
 * Carrusel de frascos: se arrastra con el mouse/dedo desde cualquier punto (con inercia y resorte), tiene flechas y
 * puntos, y al reordenarse las tarjetas se deslizan a su nuevo sitio (FLIP). Mientras se mueve publica su aceleración
 * en `sway` para que los frascos se balanceen y las monedas se sacudan.
 */
import type { GoalPlan, SavingsGoal } from "../../domain/savings";
import { t } from "../../i18n";
import { CarouselNav } from "./CarouselNav";
import { JarSlide } from "./JarSlide";
import { GAP, useCarouselPhysics, VISIBLE } from "./useCarouselPhysics";

export interface JarCard {
  goal: SavingsGoal;
  plan: GoalPlan;
  msg: string;
  sub: string;
  msgColor: string;
}

export function JarCarousel({
  cards,
  dropId,
  followId,
  sparks,
  reduced,
  onAdd,
  onWithdraw,
  onEdit,
  onNew,
  onDelete,
}: {
  cards: JarCard[];
  dropId: string | null;
  followId: string | null;
  sparks: Record<string, number>;
  reduced: boolean;
  onAdd: (id: string) => void;
  onWithdraw: (id: string) => void;
  onEdit: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const { wrap, track, sway, ph, lift, dragging, max, cur, go, onDown, onMove, onUp, onClickCap } = useCarouselPhysics({ cards, dropId, followId, reduced, onDelete });
  const cardBasis = `calc((100% - ${GAP * (VISIBLE - 1)}px) / ${VISIBLE})`;

  return (
    <>
      <div
        ref={wrap}
        data-tour="jars"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCap}
        style={{
          gridColumn: 1,
          gridRow: 2,
          position: "relative",
          zIndex: lift ? 6 : 1,
          overflowX: "clip",
          overflowY: "visible",
          margin: "-12px -6px -34px",
          padding: "12px 6px 34px",
          touchAction: "none",
          userSelect: "none",
          cursor: dragging || lift ? "grabbing" : "grab",
        }}
      >
        <div ref={track} style={{ display: "flex", gap: GAP, willChange: "transform" }}>
          {cards.map((card) => (
            <JarSlide
              key={card.goal.id}
              card={card}
              lift={lift}
              dropId={dropId}
              sparks={sparks}
              sway={sway}
              reduced={reduced}
              cardBasis={cardBasis}
              onAdd={onAdd}
              onWithdraw={onWithdraw}
              onEdit={onEdit}
            />
          ))}
          <button
            type="button"
            data-tour="new-jar"
            onClick={onNew}
            className="rb-jar-new"
            style={{
              flex: `0 0 ${cardBasis}`,
              boxSizing: "border-box",
              minHeight: 460,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              borderRadius: 32,
              cursor: "pointer",
              background: "transparent",
              fontFamily: "inherit",
              border: "1.5px dashed rgba(18,38,30,.14)",
              color: "var(--rb-faint)",
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            <div style={{ width: 46, height: 46, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(18,38,30,.05)" }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M8 3v10M3 8h10" />
              </svg>
            </div>
            {t("New jar")}
          </button>
        </div>
      </div>
      <style>{`.rb-jar-shell:hover{transform:translateY(-4px);box-shadow:inset 0 1px 1px #fff,inset 0 -10px 24px -18px rgba(255,255,255,.8),0 30px 52px -30px rgba(20,48,34,.4)!important}[data-card][data-armed="1"] .rb-jar-shell{box-shadow:inset 0 1px 1px #fff,0 0 0 2px rgba(168,68,58,.55),0 30px 52px -26px rgba(168,68,58,.45)!important}.rb-jar-new{transition:border-color .35s ease,color .35s ease,background .35s ease}.rb-jar-new:hover{border-color:rgba(23,184,102,.5)!important;color:#0b7a45!important;background:rgba(255,255,255,.3)!important}`}</style>
      <CarouselNav cur={cur} max={max} go={go} onPrev={() => go(ph.current.slide - 1)} onNext={() => go(ph.current.slide + 1)} />
    </>
  );
}
