import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  random,
} from "remotion";

// ===== Phase 1-2: Terms Confusion (reused logic) =====

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
  "#60A5FA",
  "#34D399",
  "#FBBF24",
  "#F87171",
  "#A78BFA",
  "#FB923C",
  "#2DD4BF",
  "#E879F9",
];

function garbleText(text: string, progress: number, seed: number): string {
  return text
    .split("")
    .map((char, i) => {
      if (char === " ") return " ";
      const charProgress = interpolate(
        progress,
        [i * 0.02, i * 0.02 + 0.3],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      if (charProgress > 0.1) {
        const randomIndex = Math.floor(
          random(`garble-${seed}-${i}`) * GARBLE_CHARS.length
        );
        return GARBLE_CHARS[randomIndex];
      }
      return char;
    })
    .join("");
}

// ===== Phase 4: Rating Badges =====

const RATINGS = [
  { label: "夯", bgColor: "#E53E3E" },       // red
  { label: "顶级", bgColor: "#ED8936" },      // orange
  { label: "人上人", bgColor: "#ECC94B" },     // yellow
  { label: "NPC", bgColor: "#A0AEC0" },       // gray
  { label: "拉完了", bgColor: "#CBD5E0" },     // light gray
];

const TABLE_COLS = 4; // empty columns to the right of the label

// ===== Main Component =====

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline (in seconds -> frames)
  // Phase 1: Terms appear one by one (0 - 4s)
  // Phase 2: Garble + chaos (4s - 6.5s)
  // Phase 3: Transition - calm + text (6.5s - 9s)
  // Phase 4: Rating badges appear (9s - 12.5s)
  // Phase 5: Title + fade out (12.5s - 14s)

  const garbleStart = 4.5 * fps; // 135
  const garbleEnd = 6.5 * fps; // 195
  const phase3Start = 6.5 * fps; // 195
  const phase3End = 9 * fps; // 270
  const phase4Start = 9 * fps; // 270
  const phase4End = 12 * fps; // 360
  const phase5Start = 12.5 * fps; // 375
  const totalEnd = 14 * fps; // 420

  // ===== Background =====
  const hue = interpolate(frame, [0, garbleEnd], [220, 260], {
    extrapolateRight: "clamp",
  });

  // ===== Phase 1-2: Terms Confusion =====
  const garbleProgress = interpolate(
    frame,
    [garbleStart, garbleEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Fade out the terms block during phase 3
  const termsOpacity = interpolate(
    frame,
    [phase3Start, phase3Start + 0.8 * fps],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Shake during garble
  const shakeX =
    garbleProgress > 0 && frame < phase3Start + 0.5 * fps
      ? interpolate(
          random(`shakeX-${frame}`),
          [0, 1],
          [-3 * garbleProgress, 3 * garbleProgress]
        )
      : 0;
  const shakeY =
    garbleProgress > 0 && frame < phase3Start + 0.5 * fps
      ? interpolate(
          random(`shakeY-${frame}`),
          [0, 1],
          [-2 * garbleProgress, 2 * garbleProgress]
        )
      : 0;

  // Question mark (from garble to transition)
  const questionFadeIn = interpolate(
    frame,
    [garbleStart + 0.5 * fps, garbleEnd],
    [0, 0.6],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const questionFadeOut = interpolate(
    frame,
    [phase3Start + 0.3 * fps, phase3Start + fps],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const questionOpacity = questionFadeIn * questionFadeOut;
  const questionScale = interpolate(
    frame,
    [garbleStart + 0.5 * fps, garbleEnd],
    [0.8, 1.2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ===== Phase 3: Transition Text =====
  const transitionTextEntrance = spring({
    frame: frame - (phase3Start + 0.5 * fps),
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const transitionTextOpacity = interpolate(
    frame,
    [phase3End - fps, phase3End],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const transitionTextVisible = frame > phase3Start + 0.3 * fps && frame < phase3End + 0.5 * fps;

  // ===== Phase 4: Rating Badges =====
  const badgesVisible = frame > phase4Start - 0.5 * fps;

  // ===== Phase 5: Title =====
  const titleEntrance = spring({
    frame: frame - phase5Start,
    fps,
    config: { damping: 16, stiffness: 60 },
  });
  const titleVisible = frame > phase5Start - 0.3 * fps;

  // Global fade out at the very end
  const globalOpacity = interpolate(
    frame,
    [totalEnd - 0.5 * fps, totalEnd],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 40%, 8%), hsl(${hue + 20}, 50%, 5%))`,
        opacity: globalOpacity,
      }}
    >
      {/* ===== Phase 1-2: Terms ===== */}
      {termsOpacity > 0 && (
        <AbsoluteFill
          className="flex flex-col items-center justify-center"
          style={{ opacity: termsOpacity }}
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

              const displayText =
                garbleProgress > 0
                  ? garbleText(term, garbleProgress, frame + index * 100)
                  : term;

              const normalColor = TERM_COLORS[index % TERM_COLORS.length];
              const garbleColor = `hsl(${random(`hue-${frame}-${index}`) * 360}, ${40 + random(`sat-${frame}-${index}`) * 40}%, ${50 + random(`lit-${frame}-${index}`) * 20}%)`;
              const color = garbleProgress > 0.3 ? garbleColor : normalColor;

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

          {/* Question mark overlay */}
          <div
            className="absolute flex items-center justify-center w-full h-full"
            style={{
              opacity: questionOpacity,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                color: "rgba(255, 255, 255, 0.15)",
                fontSize: 300,
                fontWeight: "bold",
                transform: `scale(${questionScale})`,
              }}
            >
              ?
            </span>
          </div>
        </AbsoluteFill>
      )}

      {/* ===== Phase 3: Transition Text ===== */}
      {transitionTextVisible && (
        <AbsoluteFill className="flex items-center justify-center">
          <div
            style={{
              opacity: transitionTextEntrance * transitionTextOpacity,
              transform: `translateY(${interpolate(transitionTextEntrance, [0, 1], [30, 0])}px)`,
              filter: `blur(${interpolate(transitionTextEntrance, [0, 1], [8, 0])}px)`,
            }}
          >
            <p
              className="text-5xl font-bold text-center"
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                letterSpacing: "2px",
                lineHeight: 1.6,
              }}
            >
              这篇文章帮你理清它们
            </p>
            <p
              className="text-2xl text-center mt-4"
              style={{
                color: "rgba(255, 255, 255, 0.4)",
                letterSpacing: "4px",
              }}
            >
              从概念到关系，一次讲明白
            </p>
          </div>
        </AbsoluteFill>
      )}

      {/* ===== Phase 4: Rating Table ===== */}
      {badgesVisible && (
        <AbsoluteFill className="flex items-center justify-center">
          <div
            style={{
              opacity: interpolate(
                frame,
                [phase4End, phase5Start],
                [1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              ),
            }}
          >
            <table
              style={{
                borderCollapse: "collapse",
                border: "2px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              <tbody>
                {RATINGS.map((rating, index) => {
                  const rowDelay = phase4Start + index * 0.35 * fps;
                  const rowEntrance = spring({
                    frame: frame - rowDelay,
                    fps,
                    config: { damping: 12, stiffness: 100 },
                  });

                  const rowOpacity = interpolate(rowEntrance, [0, 1], [0, 1]);
                  const rowX = interpolate(rowEntrance, [0, 1], [-40, 0]);

                  return (
                    <tr
                      key={rating.label}
                      style={{
                        opacity: rowOpacity,
                        transform: `translateX(${rowX}px)`,
                      }}
                    >
                      {/* Label cell with colored background */}
                      <td
                        style={{
                          background: rating.bgColor,
                          color: "#1A202C",
                          fontWeight: "bold",
                          fontSize: 28,
                          fontFamily: "monospace",
                          padding: "10px 20px",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          minWidth: 100,
                        }}
                      >
                        {rating.label}
                      </td>
                      {/* Empty columns */}
                      {Array.from({ length: TABLE_COLS }).map((_, colIdx) => (
                        <td
                          key={colIdx}
                          style={{
                            width: 80,
                            height: 48,
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            background: "rgba(255, 255, 255, 0.03)",
                          }}
                        />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AbsoluteFill>
      )}

      {/* ===== Phase 5: Title ===== */}
      {titleVisible && (
        <AbsoluteFill className="flex items-center justify-center">
          <div
            style={{
              opacity: titleEntrance,
              transform: `scale(${interpolate(titleEntrance, [0, 1], [0.9, 1])})`,
            }}
          >
            <h1
              className="text-4xl font-bold text-center"
              style={{
                color: "rgba(255, 255, 255, 0.95)",
                letterSpacing: "3px",
              }}
            >
              AI 开发中的核心概念
            </h1>
            <div
              className="flex items-center justify-center gap-3 mt-6"
              style={{ opacity: 0.5 }}
            >
              {["MCP", "Agent", "Skills", "..."].map((tag, i) => (
                <span
                  key={tag}
                  className="text-lg font-mono px-3 py-1 rounded"
                  style={{
                    color: TERM_COLORS[i],
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
