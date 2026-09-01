import { ShowMeControls } from "../../lessons/showMe";
import {
  PauseIcon,
  PlayIcon,
  ReplayIcon,
  StopIcon,
} from "./LessonCoachIcons";
import { LessonCoachShowMeProps } from "./LessonCoachTypes";

type Props = LessonCoachShowMeProps & {
  playback: ShowMeControls;
};

export default function LessonCoachPlayback({
  playback,
  onPlayLine,
  onPauseLine,
  onStopLine,
  onReplayLine,
}: Props) {
  if (!(onPlayLine || onPauseLine || onStopLine || onReplayLine)) {
    return null;
  }

  return (
    <div className="lesson-coach-playback" dir="ltr">
      {onStopLine && (
        <button
          type="button"
          className="lesson-coach-playback-stop"
          onClick={onStopLine}
          disabled={!playback.stop}
          aria-label="Stop the line"
          title="Stop"
        >
          <StopIcon />
        </button>
      )}
      {playback.primary === "play" && onPlayLine && (
        <button
          type="button"
          className="lesson-coach-play-line lesson-coach-playback-play"
          onClick={onPlayLine}
          aria-label="Play the line"
          title="Play"
        >
          <PlayIcon />
        </button>
      )}
      {playback.primary === "pause" && onPauseLine && (
        <button
          type="button"
          className="lesson-coach-play-line lesson-coach-playback-pause"
          onClick={onPauseLine}
          aria-label="Pause the line"
          title="Pause"
        >
          <PauseIcon />
        </button>
      )}
      {onReplayLine && (
        <button
          type="button"
          className="lesson-coach-playback-replay"
          onClick={onReplayLine}
          disabled={!playback.replay}
          aria-label="Replay the line"
          title="Replay"
        >
          <ReplayIcon />
        </button>
      )}
    </div>
  );
}
