import type {
  CoreEventHandler,
  CoreEventName,
  CoreEventPayloads,
} from "./types";

type HandlerMap = {
  [K in CoreEventName]?: CoreEventHandler<K>[];
};

class EventBus {
  private handlers: HandlerMap = {};

  on<T extends CoreEventName>(event: T, handler: CoreEventHandler<T>): void {
    if (!this.handlers[event]) {
      (this.handlers as Record<string, unknown[]>)[event] = [];
    }
    (this.handlers[event] as CoreEventHandler<T>[]).push(handler);
  }

  off<T extends CoreEventName>(event: T, handler: CoreEventHandler<T>): void {
    const list = this.handlers[event] as CoreEventHandler<T>[] | undefined;
    if (!list) return;
    (this.handlers as Record<string, unknown[]>)[event] = list.filter(
      (h) => h !== handler,
    );
  }

  async emit<T extends CoreEventName>(
    event: T,
    payload: CoreEventPayloads[T],
  ): Promise<void> {
    const list = this.handlers[event] as CoreEventHandler<T>[] | undefined;
    if (!list || list.length === 0) return;
    await Promise.allSettled(list.map((h) => h(payload)));
  }
}

export const eventBus = new EventBus();
