import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// VideoBackground
// - Looping video background (no `loop` attr — we handle looping in JS so the
//   fade-out → ended → reset → fade-in cycle is reliable).
// - 250ms RAF-based fade-in on load and after every loop reset.
// - 250ms fade-out when ≤ 0.55s remains before the video ends.
// - `fadingOutRef` latches so the fade-out only fires once per cycle.
// - Each new fade cancels any in-flight RAF so animations never compete.
// - Fades resume from the current opacity, never snap.
// ---------------------------------------------------------------------------

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260329_050842_be71947f-f16e-4a14-810c-06e83d23ddb5.mp4';

const FADE_MS = 250;
const FADE_OUT_BEFORE_END_S = 0.55;
const RESET_DELAY_MS = 100;

export function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const fadingOutRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Start at opacity 0; the fade-in will lift us up.
    video.style.opacity = '0';

    const cancelRaf = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const currentOpacity = () => {
      const raw = video.style.opacity;
      const n = raw === '' ? 0 : parseFloat(raw);
      return Number.isFinite(n) ? n : 0;
    };

    const animateTo = (target: number, durationMs: number) => {
      cancelRaf();
      const from = currentOpacity();
      if (durationMs <= 0) {
        video.style.opacity = String(target);
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / durationMs, 1);
        // smoothstep — softens the start/end of every fade
        const eased = t * t * (3 - 2 * t);
        const next = from + (target - from) * eased;
        video.style.opacity = String(next);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const fadeIn = () => {
      fadingOutRef.current = false;
      animateTo(1, FADE_MS);
    };

    const fadeOut = () => {
      if (fadingOutRef.current) return;
      fadingOutRef.current = true;
      animateTo(0, FADE_MS);
    };

    const handleTimeUpdate = () => {
      if (fadingOutRef.current) return;
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      const remaining = duration - video.currentTime;
      if (remaining <= FADE_OUT_BEFORE_END_S) {
        fadeOut();
      }
    };

    const handleEnded = () => {
      // video is already faded out by now
      video.style.opacity = '0';
      cancelRaf();
      window.setTimeout(() => {
        try {
          video.currentTime = 0;
        } catch {
          /* some browsers throw if seeking before metadata is ready */
        }
        const playPromise = video.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.then(fadeIn).catch(fadeIn);
        } else {
          fadeIn();
        }
      }, RESET_DELAY_MS);
    };

    // Kick off playback. The fade-in is decoupled from play() and triggers
    // off any "data is available" signal, so a slow network or a brief
    // autoplay rejection can't leave the video at opacity 0.
    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.then === 'function') p.catch(() => undefined);
    };

    const onReady = () => {
      if (!fadingOutRef.current) fadeIn();
      tryPlay();
    };

    // Multiple triggers — first one wins, the rest are no-ops because the
    // RAF will keep the opacity at 1 after the first fade completes.
    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('canplaythrough', onReady, { once: true });
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    // Safety net — if no ready event fires within ~1.2s (some headless
    // environments delay `loadeddata`), force the fade-in anyway. The video
    // element will simply have a black/transparent frame until it does load.
    const fallback = window.setTimeout(() => {
      if (currentOpacity() < 1 && !fadingOutRef.current) fadeIn();
    }, 1200);

    return () => {
      cancelRaf();
      window.clearTimeout(fallback);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src={VIDEO_SRC}
      autoPlay
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-0 z-0 h-[115%] w-[115%] -translate-x-1/2 object-cover object-top"
    />
  );
}
