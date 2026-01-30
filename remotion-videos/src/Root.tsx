import "./index.css";
import { Composition } from "remotion";
import { TextTitle } from "./compositions/TextTitle";
import { StatsCounter } from "./compositions/StatsCounter";
import { Announcement } from "./compositions/Announcement";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Text Title - Simple title card */}
      <Composition
        id="TextTitle"
        component={TextTitle}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "Your Title Here",
          subtitle: "Optional subtitle",
          backgroundColor: "#0d1117",
          textColor: "#e6edf3",
        }}
      />

      {/* Text Title - Vertical (TikTok/Reels) */}
      <Composition
        id="TextTitleVertical"
        component={TextTitle}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: "Your Title Here",
          subtitle: "For TikTok & Reels",
          backgroundColor: "#0d1117",
          textColor: "#e6edf3",
        }}
      />

      {/* Stats Counter */}
      <Composition
        id="StatsCounter"
        component={StatsCounter}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "2026 Progress",
          stats: [
            { label: "Tasks Completed", value: 127 },
            { label: "Lines of Code", value: 5420, suffix: "+" },
            { label: "Hours Saved", value: 48 },
          ],
          backgroundColor: "#0d1117",
          textColor: "#e6edf3",
          accentColor: "#1f6feb",
        }}
      />

      {/* Announcement */}
      <Composition
        id="Announcement"
        component={Announcement}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          emoji: "🚀",
          headline: "Big News!",
          body: "We're excited to announce something amazing that will change everything.",
          cta: "Learn More →",
          backgroundColor: "#0d1117",
          textColor: "#e6edf3",
          accentColor: "#238636",
        }}
      />

      {/* Announcement Vertical (TikTok/Reels) */}
      <Composition
        id="AnnouncementVertical"
        component={Announcement}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          emoji: "🎉",
          headline: "Check This Out!",
          body: "Perfect for social media stories and reels.",
          cta: "Swipe Up",
          backgroundColor: "#0d1117",
          textColor: "#e6edf3",
          accentColor: "#1f6feb",
        }}
      />
    </>
  );
};
