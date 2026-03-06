import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  random,
} from "remotion";

const TERMS = [
  "MCP",
  "Agent",
  "Subagent",
  "Skills",
  "Agent Team",
  "plugins",
  "hooks",
  "commands",
];

const GARBLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/~`αβγδεζηθικλμνξοπρστυφχψω";

const TERM_COLORS = [
  "#60A5FA", // blue
  "#34D399", // green
  "#FBBF24", // amber
  "#F87171", // red
  "#A78BFA", // purple
  "#FB923C", // orange
  "#2DD4BF", // teal
  "#E879F9", // pink
];

function garbleText(text: string, progress: number, seed: number): string {
  const chars = text.split("");
  return chars
    .map((char, i) => {
      if (char === " ") return " ";
      // Each character starts garbling at a slightly different time
      const charProgress = interpolate(
        progress,
        [i * 0.02, i * 0.02 + 0.3],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      if (charProgress > 0.1) {
        // Use frame-based randomness for flickering garble characters
        const randomIndex = Math.floor(
          random(`garble-${seed}-${i}`) * GARBLE_CHARS.length
        );
        return GARBLE_CHARS[randomIndex];
      }
      return char;
    })
    .join("");
}

export const TermsConfusion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1: Terms appear one by one (0 - 4s)
  // Phase 2: Hold (4s - 4.5s)
  // Phase 3: Garble effect (4.5s - 7s)

  const garbleStart = 4.5 * fps;
  const garbleEnd = 6.5 * fps;

  const garbleProgress = interpolate(
    frame,
    [garbleStart, garbleEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Background shake during garble
  const shakeX =
    garbleProgress > 0
      ? interpolate(
          random(`shakeX-${frame}`),
          [0, 1],
          [-3 * garbleProgress, 3 * garbleProgress]
        )
      : 0;
  const shakeY =
    garbleProgress > 0
      ? interpolate(
          random(`shakeY-${frame}`),
          [0, 1],
          [-2 * garbleProgress, 2 * garbleProgress]
        )
      : 0;

  // Background hue shift
  const hue = interpolate(frame, [0, garbleEnd], [220, 260]);

  return (
    <div
      className="flex flex-col items-center justify-center h-full w-full overflow-hidden"
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 40%, 8%), hsl(${hue + 20}, 50%, 5%))`,
      }}
    >
      <div
        className="flex flex-wrap items-center justify-center gap-4 px-16"
        style={{
          maxWidth: 1000,
          transform: `translate(${shakeX}px, ${shakeY}px)`,
        }}
      >
        {TERMS.map((term, index) => {
          const appearDelay = index * 0.45 * fps;

          const entrance = spring({
            frame: frame - appearDelay,
            fps,
            config: { damping: 12, stiffness: 120 },
          });

          const opacity = interpolate(entrance, [0, 1], [0, 1]);
          const scale = interpolate(entrance, [0, 1], [0.5, 1]);
          const translateY = interpolate(entrance, [0, 1], [20, 0]);

          // Display text: either normal or garbled
          const displayText =
            garbleProgress > 0
              ? garbleText(term, garbleProgress, frame + index * 100)
              : term;

          // Color shifts to red/grey during garble
          const normalColor = TERM_COLORS[index % TERM_COLORS.length];
          const garbleColor = `hsl(${random(`hue-${frame}-${index}`) * 360}, ${40 + random(`sat-${frame}-${index}`) * 40}%, ${50 + random(`lit-${frame}-${index}`) * 20}%)`;

          const color =
            garbleProgress > 0.3 ? garbleColor : normalColor;

          return (
            <div
              key={index}
              className="text-4xl font-bold font-mono px-4 py-2 rounded-lg"
              style={{
                opacity,
                transform: `scale(${scale}) translateY(${translateY}px)`,
                color,
                background: `rgba(255, 255, 255, ${0.05 + garbleProgress * 0.03})`,
                border: `1px solid rgba(255, 255, 255, ${0.1 + garbleProgress * 0.05})`,
                letterSpacing: garbleProgress > 0 ? `${garbleProgress * 2}px` : "0px",
              }}
            >
              {displayText}
            </div>
          );
        })}
      </div>

      {/* Question mark overlay that fades in during garble */}
      <div
        className="absolute text-9xl font-bold"
        style={{
          opacity: interpolate(
            garbleProgress,
            [0.5, 1],
            [0, 0.6],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          ),
          color: "rgba(255, 255, 255, 0.15)",
          fontSize: 300,
          transform: `scale(${interpolate(garbleProgress, [0.5, 1], [0.8, 1.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
        }}
      >
        ?
      </div>
    </div>
  );
};
