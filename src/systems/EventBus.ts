export type GameEvent = {
  type: string;
  characterId: string;
  payload?: Record<string, unknown>;
};

type EventListener = (event: GameEvent) => void;

export class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();

  subscribe(eventType: string, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  emit(event: GameEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const createEventBus = (): EventBus => {
  return new EventBus();
};
