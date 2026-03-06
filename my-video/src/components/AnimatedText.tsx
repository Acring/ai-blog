import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type AnimatedTextProps = {
  text: string;
  delay?: number;
  fadeOutStart?: number;
  className?: string;
};

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  fadeOutStart = 105,
  className = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance: spring fade-in + slide-up
  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Exit: linear fade-out + slide-up over 30 frames
  const exitProgress = interpolate(frame, [fadeOutStart, fadeOutStart + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]) * (1 - exitProgress);
  const translateY =
    interpolate(entrance, [0, 1], [30, 0]) +
    interpolate(exitProgress, [0, 1], [0, -30]);

  return (
    <div
      className={className}
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {text}
    </div>
  );
};
