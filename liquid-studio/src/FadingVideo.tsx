import { useEffect, useRef, useState, type CSSProperties } from 'react';

type Props = { src: string | string[]; className?: string; style?: CSSProperties; poster?: string; paused?: boolean };

export default function FadingVideo({ src, className, style, poster, paused = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedRef = useRef(paused);
  const syncPlayback = useRef<() => void>(() => {});
  pausedRef.current = paused;
  const [blocked, setBlocked] = useState(false);
  const sourceKey = JSON.stringify(src);
  useEffect(() => {
    const video = videoRef.current!;
    const sources: string[] = typeof src === 'string' ? [src] : src;
    let index = 0;
    let frame = 0;
    let disposed = false;
    let fadingOut = false;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const fade = (to: number, duration: number) => {
      cancelAnimationFrame(frame);
      const from = Number(video.style.opacity || 0);
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        video.style.opacity = String(from + (to - from) * progress);
        if (progress < 1 && !disposed) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    const play = () => {
      if (disposed || pausedRef.current || media.matches) return;
      void video.play().then(() => { if (!disposed) setBlocked(false); }).catch(() => { if (!disposed) { setBlocked(true); video.style.opacity = '1'; } });
    };
    const loaded = () => { fadingOut = false; if (pausedRef.current || media.matches) video.style.opacity = '1'; else { fade(1, 500); play(); } };
    const timeupdate = () => {
      if (!fadingOut && !video.paused && Number.isFinite(video.duration) && video.duration - video.currentTime <= .55) {
        fadingOut = true;
        fade(0, 550);
      }
    };
    const ended = () => {
      cancelAnimationFrame(frame);
      video.style.opacity = '0';
      fadingOut = false;
      if (sources.length > 1) { index = (index + 1) % sources.length; video.src = sources[index]; video.load(); }
      else { video.currentTime = 0; play(); fade(1, 500); }
    };
    const error = () => { setBlocked(true); video.style.opacity = '1'; };
    const motionChanged = () => {
      if (media.matches || pausedRef.current) { cancelAnimationFrame(frame); video.pause(); video.style.opacity = '1'; }
      else { play(); fade(1, 500); }
    };
    video.addEventListener('loadeddata', loaded);
    video.addEventListener('timeupdate', timeupdate);
    video.addEventListener('ended', ended);
    video.addEventListener('error', error);
    media.addEventListener('change', motionChanged);
    syncPlayback.current = motionChanged;
    video.style.opacity = '0';
    if (sources.length) { video.src = sources[0]; video.load(); }
    if (pausedRef.current || media.matches) video.pause();
    return () => {
      disposed = true; cancelAnimationFrame(frame);
      video.removeEventListener('loadeddata', loaded);
      video.removeEventListener('timeupdate', timeupdate);
      video.removeEventListener('ended', ended);
      video.removeEventListener('error', error);
      media.removeEventListener('change', motionChanged);
      video.pause();
    };
  // The serialized key also handles arrays passed inline by a parent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);
  useEffect(() => {
    const video = videoRef.current;
    if (video && video.readyState >= 2) syncPlayback.current();
    else if (paused) video?.pause();
  }, [paused]);
  return <video ref={videoRef} aria-hidden="true" data-playback-blocked={blocked || undefined} className={className} style={{ ...style, opacity: 0 }} poster={poster} autoPlay={!paused && !matchMedia('(prefers-reduced-motion: reduce)').matches} muted playsInline preload="auto" />;
}
