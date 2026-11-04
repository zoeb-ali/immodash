"use client";

import { Play } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useI18n } from "@/lib/useLang";

/** The 50-second pitch film: a poster with a play button; the video loads only when someone presses play. */
export function PitchVideo() {
  const { t } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const start = () => { setPlaying(true); requestAnimationFrame(() => ref.current?.play().catch(() => {})); };
  return (
    <div className={`pitch-video${playing ? " is-playing" : ""}`}>
      <video ref={ref} src="/video/immodash-pitch.mp4" poster="/video/immodash-pitch-poster.webp" preload="none" playsInline
        controls={playing} width={1600} height={900}
        aria-label={t("ImmoDash in 50 seconds, a short film about the project", "ImmoDash in 50 Sekunden, ein kurzer Film über das Projekt")} />
      {!playing && (
        <button type="button" className="pitch-play" onClick={start} aria-label={t("Play the video (50 seconds, with sound)", "Video abspielen (50 Sekunden, mit Ton)")}>
          <span className="pitch-play-icon" aria-hidden><Play size={34} weight="fill" /></span>
        </button>
      )}
    </div>
  );
}
