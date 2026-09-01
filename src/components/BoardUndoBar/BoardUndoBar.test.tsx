import { render } from "@testing-library/react";
import BoardUndoBar from "./BoardUndoBar";

describe("BoardUndoBar", () => {
  it("places Undo and Redo under the board controls and disables them until a move exists", () => {
    const { getByRole } = render(
      <BoardUndoBar canUndo={false} canRedo={false} onUndo={() => undefined} onRedo={() => undefined} />
    );
    expect(getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(getByRole("button", { name: "Redo" })).toBeDisabled();
  });

  it("enables Undo after a move and Redo after an undo", () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    const { getByRole, rerender } = render(
      <BoardUndoBar canUndo onRedo={onRedo} canRedo={false} onUndo={onUndo} />
    );
    const undo = getByRole("button", { name: "Undo" });
    expect(undo).toBeEnabled();
    expect(getByRole("button", { name: "Redo" })).toBeDisabled();
    undo.click();
    expect(onUndo).toHaveBeenCalled();

    rerender(<BoardUndoBar canUndo={false} canRedo onUndo={onUndo} onRedo={onRedo} />);
    const redo = getByRole("button", { name: "Redo" });
    expect(redo).toBeEnabled();
    redo.click();
    expect(onRedo).toHaveBeenCalled();
  });
});
