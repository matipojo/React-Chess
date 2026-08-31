import { useEffect, useState } from "react";
import {
  getLessonDebugEvents,
  LessonDebugEvent,
  subscribeLessonDebugLog,
} from "../lessons/debugLog";

export function useLessonDebugLog(): LessonDebugEvent[] {
  const [events, setEvents] = useState<LessonDebugEvent[]>(() => getLessonDebugEvents());

  useEffect(() => {
    return subscribeLessonDebugLog(() => {
      setEvents(getLessonDebugEvents());
    });
  }, []);

  return events;
}
