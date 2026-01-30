import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Sequence } from "remotion";

interface AnnouncementProps {
  emoji?: string;
  headline: string;
  body: string;
  cta?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

export const Announcement: React.FC<AnnouncementProps> = ({
  emoji = "🚀",
  headline,
  body,
  cta,
  backgroundColor = "#0d1117",
  textColor = "#e6edf3",
  accentColor = "#238636",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Overall fade
  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  // Emoji bounce
  const emojiScale = interpolate(
    frame,
    [0, 10, 15, 20],
    [0, 1.3, 0.9, 1],
    { extrapolateRight: "clamp" }
  );

  // Headline slide in
  const headlineX = interpolate(
    frame,
    [10, 25],
    [-50, 0],
    { extrapolateRight: "clamp" }
  );
  const headlineOpacity = interpolate(
    frame,
    [10, 25],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  // Body fade in
  const bodyOpacity = interpolate(
    frame,
    [25, 40],
    [0, 1],
    { extrapolateRight: "clamp" }
  );

  // CTA pulse
  const ctaScale = interpolate(
    frame,
    [45, 50, 55, 60, 65, 70],
    [0, 1.1, 1, 1.05, 1, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const ctaOpacity = interpolate(
    frame,
    [45, 55],
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
      <div style={{ textAlign: "center", maxWidth: 900 }}>
        {/* Emoji */}
        <div
          style={{
            fontSize: 120,
            marginBottom: 30,
            transform: `scale(${emojiScale})`,
          }}
        >
          {emoji}
        </div>

        {/* Headline */}
        <h1
          style={{
            color: textColor,
            fontSize: 56,
            fontWeight: "bold",
            fontFamily: "Inter, system-ui, sans-serif",
            marginBottom: 24,
            transform: `translateX(${headlineX}px)`,
            opacity: headlineOpacity,
            lineHeight: 1.2,
          }}
        >
          {headline}
        </h1>

        {/* Body */}
        <p
          style={{
            color: textColor,
            fontSize: 28,
            fontFamily: "Inter, system-ui, sans-serif",
            opacity: bodyOpacity * 0.8,
            lineHeight: 1.5,
            marginBottom: 40,
          }}
        >
          {body}
        </p>

        {/* CTA */}
        {cta && (
          <div
            style={{
              display: "inline-block",
              backgroundColor: accentColor,
              color: "#ffffff",
              fontSize: 24,
              fontWeight: "bold",
              fontFamily: "Inter, system-ui, sans-serif",
              padding: "16px 40px",
              borderRadius: 8,
              transform: `scale(${ctaScale})`,
              opacity: ctaOpacity,
            }}
          >
            {cta}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
