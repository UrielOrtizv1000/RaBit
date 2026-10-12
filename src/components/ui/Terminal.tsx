/** Burbuja oscura estilo terminal ("rabit@página"): la voz de RaBit en cada página. */
export function Terminal({ name, greeting, line }: { name: string; greeting: string; line: string }): JSX.Element {
  return (
    <div
      style={{
        position: "relative",
        animation: "rb-rise .45s ease-out .1s both",
        borderRadius: 28,
        background: "linear-gradient(150deg,rgba(12,24,18,.9),rgba(16,40,29,.82))",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        border: "1px solid rgba(255,255,255,.12)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.14),inset 0 0 0 1px rgba(61,220,132,.08),0 30px 60px -30px rgba(10,30,20,.75)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "14px 20px 0" }}>
        <div style={{ width: 7, height: 7, background: "#3ddc84" }} />
        <div style={{ width: 7, height: 7, background: "rgba(61,220,132,.45)" }} />
        <div style={{ width: 7, height: 7, background: "rgba(61,220,132,.2)" }} />
        <div style={{ marginLeft: 6, fontFamily: "Silkscreen,monospace", fontSize: 9, letterSpacing: ".1em", color: "#6ee6a4" }}>{name}</div>
      </div>
      <div style={{ padding: "12px 22px 20px" }}>
        <div style={{ fontFamily: "Silkscreen,monospace", fontSize: 11, color: "#6ee6a4", letterSpacing: ".06em", marginBottom: 9 }}>
          {"> "}
          {greeting}
        </div>
        <div style={{ fontFamily: "Doto,monospace", fontWeight: 900, fontSize: 20, lineHeight: 1.25, color: "#3ddc84", textShadow: "0 0 12px rgba(61,220,132,.5)" }}>
          {line}
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 18,
              marginLeft: 8,
              verticalAlign: -3,
              background: "#3ddc84",
              boxShadow: "0 0 9px rgba(61,220,132,.8)",
              animation: "rb-cursor 1.1s steps(1) infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
