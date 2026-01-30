import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface Stat {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
}

interface StatsCounterProps {
  title: string;
  stats: Stat[];
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

export const StatsCounter: React.FC<StatsCounterProps> = ({
  title,
  stats,
  backgroundColor = "#0d1117",
  textColor = "#e6edf3",
  accentColor = "#1f6feb",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // Fade in/out
  const opacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  // Title animation
  const titleY = interpolate(frame, [0, 20], [50, 0], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        padding: 60,
        opacity,
      }}
    >
      <h1
        style={{
          color: textColor,
          fontSize: 48,
          fontWeight: "bold",
          fontFamily: "Inter, system-ui, sans-serif",
          marginBottom: 60,
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
        }}
      >
        {title}
      </h1>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          flex: 1,
        }}
      >
        {stats.map((stat, index) => {
          // Stagger the animations
          const delay = index * 10;
          const startFrame = 20 + delay;
          const endFrame = startFrame + 30;

          const countProgress = interpolate(
            frame,
            [startFrame, endFrame],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          const currentValue = Math.floor(stat.value * countProgress);

          const statOpacity = interpolate(
            frame,
            [startFrame, startFrame + 10],
            [0, 1],
            { extrapolateRight: "clamp" }
          );

          const statScale = interpolate(
            frame,
            [startFrame, startFrame + 15],
            [0.5, 1],
            { extrapolateRight: "clamp" }
          );

          return (
            <div
              key={stat.label}
              style={{
                textAlign: "center",
                opacity: statOpacity,
                transform: `scale(${statScale})`,
              }}
            >
              <div
                style={{
                  color: accentColor,
                  fontSize: 80,
                  fontWeight: "bold",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                {stat.prefix || ""}
                {currentValue.toLocaleString()}
                {stat.suffix || ""}
              </div>
              <div
                style={{
                  color: textColor,
                  fontSize: 24,
                  fontFamily: "Inter, system-ui, sans-serif",
                  marginTop: 10,
                  opacity: 0.8,
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
