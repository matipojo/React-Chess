import { fireEvent, render } from "@testing-library/react";
import DemoGif from "./DemoGif";

describe("DemoGif", () => {
  it("shows the poster until play, then the gif, then the poster again on stop", () => {
    const onPlay = jest.fn();
    const onStop = jest.fn();
    const { getByRole, rerender } = render(
      <DemoGif
        src="/demos/clip.gif"
        poster="/demos/clip-poster.jpg"
        label="Chess"
        alt="Scholar's Mate demo"
        playing={false}
        onPlay={onPlay}
        onStop={onStop}
      />
    );

    const image = getByRole("img", { name: "Scholar's Mate demo" }) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("/demos/clip-poster.jpg");
    const play = getByRole("button", { name: "Play Chess demo" });
    expect(play.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(play);
    expect(onPlay).toHaveBeenCalled();

    rerender(
      <DemoGif
        src="/demos/clip.gif"
        poster="/demos/clip-poster.jpg"
        label="Chess"
        alt="Scholar's Mate demo"
        playing={true}
        onPlay={onPlay}
        onStop={onStop}
      />
    );
    const playingImage = getByRole("img", { name: "Scholar's Mate demo" }) as HTMLImageElement;
    expect(playingImage.getAttribute("src")).toMatch(/^\/demos\/clip\.gif\?play=/);
    const stop = getByRole("button", { name: "Stop Chess demo" });
    expect(stop.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(stop);
    expect(onStop).toHaveBeenCalled();
  });
});
