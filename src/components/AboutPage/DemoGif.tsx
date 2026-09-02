import { useState } from "react";
import { PlayIcon, StopIcon } from "../LessonCoach/LessonCoachIcons";

type Props = {
  src: string;
  poster: string;
  label: string;
  alt: string;
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
};

export default function DemoGif({
  src,
  poster,
  label,
  alt,
  playing,
  onPlay,
  onStop,
}: Props) {
  const [playKey, setPlayKey] = useState(0);

  function play() {
    setPlayKey((key) => key + 1);
    onPlay();
  }

  return (
    <div className={playing ? "about-gif is-playing" : "about-gif"}>
      {playing ? (
        <img key={playKey} src={`${src}?play=${playKey}`} alt={alt} />
      ) : (
        <img src={poster} alt={alt} />
      )}
      <button
        type="button"
        className="about-gif-toggle"
        aria-label={playing ? `Stop ${label} demo` : `Play ${label} demo`}
        aria-pressed={playing}
        onClick={playing ? onStop : play}
      >
        {playing ? <StopIcon /> : <PlayIcon />}
      </button>
    </div>
  );
}
