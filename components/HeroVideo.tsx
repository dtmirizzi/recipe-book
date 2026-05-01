'use client';

import { useEffect, useRef } from 'react';

/**
 * Background video for the landing hero. Source video is lightly graded
 * already; CSS adds heavy blur + a warm tomato tint + a paper-warm fade
 * at the bottom so it transitions cleanly into the feature cards section.
 *
 * Falls back to the poster image when:
 *   - prefers-reduced-motion: reduce
 *   - the user has previously paused via the data-attribute (future hook)
 *   - the video fails to load
 */
// 0.6× of source = ~25 sec loop. More cinematic, less "stock B-roll" feel.
const PLAYBACK_RATE = 0.6;

export function HeroVideo() {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Slow the video — needs to be reapplied on metadata load (browsers
    // sometimes reset playbackRate when a new source attaches).
    const setRate = () => {
      v.playbackRate = PLAYBACK_RATE;
    };
    setRate();
    v.addEventListener('loadedmetadata', setRate);
    v.addEventListener('play', setRate);

    // Pause when the tab is hidden — saves CPU + battery.
    const onVisibility = () => {
      if (document.hidden) v.pause();
      else void v.play().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      v.removeEventListener('loadedmetadata', setRate);
      v.removeEventListener('play', setRate);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className="hero-video-wrap" aria-hidden="true">
      <video
        ref={ref}
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/videos/landing-hero-poster.jpg"
      >
        <source src="/videos/landing-hero.webm" type="video/webm" />
        <source src="/videos/landing-hero.mp4" type="video/mp4" />
      </video>
      <div className="hero-overlay" />
    </div>
  );
}
