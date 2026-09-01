export type DebugKind = "tool" | "user-move" | "visual";

export type LessonDebugEvent = {
  id: number;
  t: number;
  iso: string;
  kind: DebugKind;
  name: string;
  detail: Record<string, unknown>;
};

const MAX_EVENTS = 400;
const listeners = new Set<() => void>();

let nextId = 1;
let events: LessonDebugEvent[] = [];

function safeDetail(detail: Record<string, unknown>): Record<string, unknown> {
  try {
    return JSON.parse(JSON.stringify(detail)) as Record<string, unknown>;
  } catch {
    return { unserializable: String(detail) };
  }
}

export function logLessonDebug(
  kind: DebugKind,
  name: string,
  detail: Record<string, unknown> = {}
): LessonDebugEvent {
  const t = Date.now();
  const event: LessonDebugEvent = {
    id: nextId++,
    t,
    iso: new Date(t).toISOString(),
    kind,
    name,
    detail: safeDetail(detail),
  };
  events = events.concat(event);
  if (events.length > MAX_EVENTS) {
    events = events.slice(events.length - MAX_EVENTS);
  }
  listeners.forEach((listener) => listener());
  return event;
}

export function getLessonDebugEvents(): LessonDebugEvent[] {
  return events;
}

export function clearLessonDebugLog(): void {
  events = [];
  listeners.forEach((listener) => listener());
}

export function subscribeLessonDebugLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function lessonDebugLogAsJson(): string {
  return JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      eventCount: events.length,
      events,
    },
    null,
    2
  );
}

export function resetLessonDebugLogForTests(): void {
  nextId = 1;
  events = [];
}
