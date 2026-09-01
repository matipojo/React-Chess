export type ExperimentCursor = {
  index: number;
  length: number;
};

export function emptyExperimentCursor(): ExperimentCursor {
  return { index: -1, length: 0 };
}

export function seededExperimentCursor(): ExperimentCursor {
  return { index: 0, length: 1 };
}

export function recordExperimentCursor(cursor: ExperimentCursor): ExperimentCursor {
  const length = Math.max(cursor.index, -1) + 2;
  return { index: length - 1, length };
}

export function canUndoExperiment(cursor: ExperimentCursor): boolean {
  return cursor.index > 0;
}

export function canRedoExperiment(cursor: ExperimentCursor): boolean {
  return cursor.index >= 0 && cursor.index < cursor.length - 1;
}

export function undoExperimentCursor(cursor: ExperimentCursor): ExperimentCursor | null {
  if (!canUndoExperiment(cursor)) {
    return null;
  }
  return { ...cursor, index: cursor.index - 1 };
}

export function redoExperimentCursor(cursor: ExperimentCursor): ExperimentCursor | null {
  if (!canRedoExperiment(cursor)) {
    return null;
  }
  return { ...cursor, index: cursor.index + 1 };
}

export function truncateItems<T>(items: T[], index: number): T[] {
  return items.slice(0, Math.max(index, -1) + 1);
}
