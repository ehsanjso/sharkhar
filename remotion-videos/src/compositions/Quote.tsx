import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface QuoteProps {
  quote: string;
  author?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

export const Quote: React.FC<QuoteProps> = ({
  quote,
  author,
  backgroundColor = "#0d1117",
  textColor = "#e6edf3",
  accentColor = "#58a6ff",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in/out
  const opacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  // Quote mark animation
  const quoteMarkOpacity = interpolate(
    frame,
    [0, 10],
    [0, 0.15],
    { extrapolateRight: "clamp" }
  );

  const quoteMarkScale = interpolate(
    frame,
    [0, 15],
    [0.5, 1],
    { extrapolateRight: "clamp" }
  );

  // Quote text slide up
  const textY = interpolate(
    frame,
    [5, 25],
    [40, 0],
    { extrapolateRight: "clamp" }
  );

  const textOpacity = interpolate(
    frame,
    [5, 25],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  // Author fade in (delayed)
  const authorOpacity = interpolate(
    frame,
    [30, 45],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        opacity,
      }}
    >
      {/* Large decorative quote mark */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 60,
          fontSize: 300,
          fontFamily: "Georgia, serif",
          color: accentColor,
          opacity: quoteMarkOpacity,
          transform: `scale(${quoteMarkScale})`,
          lineHeight: 1,
        }}
      >
        "
      </div>

      <div
        style={{
          maxWidth: 900,
          textAlign: "center",
          zIndex: 1,
        }}
      >
        {/* Quote text */}
        <p
          style={{
            color: textColor,
            fontSize: 48,
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            lineHeight: 1.4,
            margin: 0,
            transform: `translateY(${textY}px)`,
            opacity: textOpacity,
          }}
        >
          "{quote}"
        </p>

        {/* Author attribution */}
        {author && (
          <p
            style={{
              color: accentColor,
              fontSize: 28,
              fontFamily: "Inter, system-ui, sans-serif",
              marginTop: 40,
              opacity: authorOpacity,
            }}
          >
            — {author}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};
