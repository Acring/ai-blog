import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedText } from "./components/AnimatedText";

export const MyComposition = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Background hue shifts from 220 to 260 over the full duration
  const hue = interpolate(frame, [0, durationInFrames], [220, 260]);

  // Decorative line width animation
  const lineWidth = interpolate(frame, [0, 60, durationInFrames - 30, durationInFrames], [0, 60, 60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      className="flex flex-col items-center justify-center h-full w-full"
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 40%, 12%), hsl(${hue + 20}, 50%, 8%))`,
      }}
    >
      {/* Decorative gradient line */}
      <div
        className="mb-8 rounded-full"
        style={{
          width: `${lineWidth}%`,
          height: 3,
          background: `linear-gradient(90deg, transparent, hsl(${hue + 40}, 70%, 60%), transparent)`,
        }}
      />

      <AnimatedText
        text="Hello World"
        delay={0}
        fadeOutStart={105}
        className="text-white text-7xl font-bold tracking-tight"
      />

      <AnimatedText
        text="Welcome to Remotion"
        delay={15}
        fadeOutStart={120}
        className="text-gray-300 text-3xl font-light mt-6"
      />

      {/* Bottom decorative gradient line */}
      <div
        className="mt-8 rounded-full"
        style={{
          width: `${lineWidth * 0.6}%`,
          height: 2,
          background: `linear-gradient(90deg, transparent, hsl(${hue + 40}, 70%, 60%), transparent)`,
        }}
      />
    </div>
  );
};
