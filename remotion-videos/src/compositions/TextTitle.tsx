import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface TextTitleProps {
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
}

export const TextTitle: React.FC<TextTitleProps> = ({
  title,
  subtitle,
  backgroundColor = "#0d1117",
  textColor = "#e6edf3",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in animation
  const opacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  // Scale animation
  const scale = interpolate(
    frame,
    [0, 20],
    [0.8, 1],
    { extrapolateRight: "clamp" }
  );

  // Title slide up
  const titleY = interpolate(
    frame,
    [0, 20],
    [30, 0],
    { extrapolateRight: "clamp" }
  );

  // Subtitle delay
  const subtitleOpacity = interpolate(
    frame,
    [15, 30],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            color: textColor,
            fontSize: 72,
            fontWeight: "bold",
            fontFamily: "Inter, system-ui, sans-serif",
            margin: 0,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              color: textColor,
              fontSize: 32,
              fontFamily: "Inter, system-ui, sans-serif",
              marginTop: 20,
              opacity: subtitleOpacity,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
