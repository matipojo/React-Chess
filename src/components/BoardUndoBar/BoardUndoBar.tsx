import "./BoardUndoBar.css";

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

export default function BoardUndoBar({ canUndo, canRedo, onUndo, onRedo }: Props) {
  return (
    <div className="board-undo-bar" dir="ltr">
      <button type="button" onClick={onUndo} disabled={!canUndo}>
        Undo
      </button>
      <button type="button" onClick={onRedo} disabled={!canRedo}>
        Redo
      </button>
    </div>
  );
}
