/** Tiny typed event emitter used by every transport implementation. */
export class Emitter<Events extends Record<string, (...args: never[]) => void>> {
  private handlers = new Map<keyof Events, Set<(...args: never[]) => void>>();

  on<K extends keyof Events>(event: K, handler: Events[K]): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as (...args: never[]) => void);
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: Events[K]): void {
    this.handlers.get(event)?.delete(handler as (...args: never[]) => void);
  }

  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      (handler as (...a: unknown[]) => void)(...args);
    }
  }
}
