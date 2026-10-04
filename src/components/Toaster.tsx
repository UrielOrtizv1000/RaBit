/**
 * Aviso flotante inferior con acción «Deshacer» opcional. El estado vive en `useUi().toast` (uno a la vez).
 */
import { useUi } from "../store/ui";
import { t } from "../i18n";

export function Toaster() {
  const toast = useUi((s) => s.toast);
  const clear = useUi((s) => s.clearToast);
  if (!toast) return null;
  return (
    <div
      role="status"
      key={toast.id}
      style={{
        position: "absolute",
        left: "50%",
        bottom: 28,
        transform: "translateX(-50%)",
        zIndex: 90,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "11px 18px",
        borderRadius: 999,
        maxWidth: "min(560px, calc(100% - 40px))",
        boxSizing: "border-box",
        background: "linear-gradient(150deg,rgba(14,26,20,.92),rgba(18,40,30,.86))",
        color: "#eef4f0",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.12),0 16px 32px -12px rgba(12,30,22,.7)",
        animation: "rb-toast .22s ease-out both",
      }}
    >
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{toast.text}</span>
      {toast.undo && (
        <button
          onClick={() => {
            toast.undo?.();
            clear();
          }}
          style={{
            flex: "none",
            border: 0,
            background: "transparent",
            color: "#3ddc84",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "Silkscreen,monospace",
            fontSize: 11,
            letterSpacing: ".1em",
          }}
        >
          {t("UNDO")}
        </button>
      )}
    </div>
  );
}
