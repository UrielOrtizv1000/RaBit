/**
 * Registro mínimo de errores recuperables.
 * Regla del proyecto: no se traga ninguna excepción en silencio; si el fallo es esperable (sin permiso, sin
 * almacenamiento…) se registra con su contexto y la app continúa. Nunca se registran datos personales
 * (títulos, notas, nombre): solo el ámbito y el mensaje técnico del error.
 */
export function logWarn(scope: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[rabit:${scope}] ${msg}`);
}
