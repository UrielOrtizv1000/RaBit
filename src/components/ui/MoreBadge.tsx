/** Contador "+N" para los bloques que no caben en la rejilla. */
export function MoreBadge({ n }: { n: number }): JSX.Element {
  return (
    <div
      title={`+${n}`}
      style={{
        position: "absolute",
        top: 2,
        right: 2,
        zIndex: 6,
        minWidth: 18,
        height: 16,
        padding: "0 5px",
        boxSizing: "border-box",
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "#121a16",
        color: "#fff",
        fontSize: 9.5,
        fontWeight: 700,
        pointerEvents: "none",
      }}
    >
      +{n}
    </div>
  );
}
