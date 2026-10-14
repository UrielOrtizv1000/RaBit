/**
 * Carrusel de frascos: flechas anterior/siguiente y puntos de página.
 */
import { t } from "../../i18n";
import { ease, navBtn } from "./useCarouselPhysics";

interface Props {
  cur: number;
  max: number;
  go: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function CarouselNav({ cur, max, go, onPrev, onNext }: Props) {
  return (
    <div style={{ gridColumn: 1, gridRow: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <button type="button" aria-label={t("Previous")} onClick={() => onPrev()} className="rb-hover-scale" style={{ ...navBtn, opacity: cur > 0 ? 1 : 0.35 }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 3 5 8l5 5" />
        </svg>
      </button>
      <div style={{ display: "flex", gap: 7 }}>
        {Array.from({ length: max + 1 }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}`}
            onClick={() => go(i)}
            style={{
              height: 7,
              width: i === cur ? 22 : 7,
              padding: 0,
              border: 0,
              borderRadius: 4,
              cursor: "pointer",
              background: i === cur ? "#17b866" : "rgba(18,38,30,.16)",
              transition: `width .45s ${ease},background .3s ease`,
            }}
          />
        ))}
      </div>
      <button type="button" aria-label={t("Next")} onClick={() => onNext()} className="rb-hover-scale" style={{ ...navBtn, opacity: cur < max ? 1 : 0.35 }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 3 5 5-5 5" />
        </svg>
      </button>
    </div>
  );
}
