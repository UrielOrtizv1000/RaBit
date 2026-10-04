/** Punto de extensión para sincronización futura. En la versión de prueba no hay red. */
export interface SyncProvider {
  push(): Promise<void>;
  pull(): Promise<void>;
}

export class LocalOnlyProvider implements SyncProvider {
  async push(): Promise<void> {
    /* los datos ya viven en SQLite local */
  }
  async pull(): Promise<void> {
    /* nada que traer */
  }
}

export const syncProvider: SyncProvider = new LocalOnlyProvider();
