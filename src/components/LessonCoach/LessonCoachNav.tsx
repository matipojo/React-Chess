import { SkipEndIcon, SkipStartIcon } from "./LessonCoachIcons";

type SlideCount = {
  current: number;
  total: number;
};

type Props = {
  slideCount: SlideCount | null;
  dir: string;
  onBack?: () => void;
  onNext?: () => void;
  onFirst?: () => void;
  onLast?: () => void;
  onFinish?: () => void;
  canBack?: boolean;
  canNext?: boolean;
  canFirst?: boolean;
  canLast?: boolean;
  nextGenerating?: boolean;
};

export default function LessonCoachNav({
  slideCount,
  dir,
  onBack,
  onNext,
  onFirst,
  onLast,
  onFinish,
  canBack,
  canNext,
  canFirst,
  canLast,
  nextGenerating,
}: Props) {
  if (!(onBack || onNext || nextGenerating || onFinish)) {
    return null;
  }

  return (
    <div className="lesson-coach-nav-wrap">
      {slideCount && (onBack || onNext || nextGenerating) && (
        <p
          className="lesson-coach-slide-count"
          dir="ltr"
          aria-live="polite"
          aria-label={`Slide ${slideCount.current} of ${slideCount.total}`}
        >
          {slideCount.current}/{slideCount.total}
        </p>
      )}
      {(onBack || onNext || nextGenerating) && (
        <div className="lesson-coach-nav" dir="ltr">
          {onFirst && (
            <button
              type="button"
              className="lesson-coach-nav-icon"
              aria-label="First step"
              title="First step"
              onClick={onFirst}
              disabled={!canFirst}
            >
              <SkipStartIcon />
            </button>
          )}
          <button type="button" onClick={onBack} disabled={!canBack}>
            Back
          </button>
          <button
            type="button"
            className={
              nextGenerating ? "lesson-coach-next-generating" : undefined
            }
            onClick={onNext}
            disabled={!canNext || nextGenerating}
            aria-busy={nextGenerating ? true : undefined}
            aria-label={nextGenerating ? "Generating next screen" : "Next"}
          >
            {nextGenerating ? (
              <span className="lesson-generating-label">
                Generating
                <span className="lesson-generating-dots" aria-hidden="true" />
              </span>
            ) : (
              "Next"
            )}
          </button>
          {onLast && (
            <button
              type="button"
              className="lesson-coach-nav-icon"
              aria-label="Last step"
              title="Last step"
              onClick={onLast}
              disabled={!canLast}
            >
              <SkipEndIcon />
            </button>
          )}
        </div>
      )}
      {onFinish && (
        <button
          type="button"
          className="lesson-coach-finish"
          aria-label="Finish lesson"
          onClick={onFinish}
        >
          {dir === "rtl" ? "סיום" : "Finish"}
        </button>
      )}
    </div>
  );
}
