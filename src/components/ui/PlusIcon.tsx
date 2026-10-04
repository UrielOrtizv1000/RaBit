/** Icono "+" dibujado con dos barras (se mantiene nítido a cualquier escala). */
export function PlusIcon() {
  return (
    <div style={{ position: "relative", width: 9, height: 9 }}>
      <div style={{ position: "absolute", left: 0, top: 3, width: 9, height: 3, background: "#fff" }} />
      <div style={{ position: "absolute", left: 3, top: 0, width: 3, height: 9, background: "#fff" }} />
    </div>
  );
}
