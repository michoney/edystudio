import { useEffect, useRef, useState } from 'react';

const sourceUrl = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4';
const panels = {
  Studio: ['A space for possibility.', 'Building platforms for brilliant minds, fearless makers, and thoughtful souls.'],
  About: ['Made for a quieter world.', 'Through the noise, we craft digital havens for deep work and pure flows.'],
  Journal: ['Notes on the eternal.', '001 / Aethera — a cinematic exploration of space, silence, and digital craft.'],
  'Reach Us': ['Let’s begin a conversation.', 'Aethera is the first web showcase from EdyStudio. Explore the studio to discover more work.'],
  'Begin Journey': ['Every journey starts here.', 'Discover Aethera, the first cinematic web experience in the EdyStudio collection.'],
} as const;
type Panel = keyof typeof panels;

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [panel, setPanel] = useState<Panel>('Begin Journey');
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showPoster, setShowPoster] = useState(true);

  useEffect(() => {
    const video = videoRef.current!;
    let frame = 0;
    let restart: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const play = () => { void video.play().catch(() => { if (!disposed) setPlaying(false); }); };
    const update = () => {
      const { currentTime, duration } = video;
      if (Number.isFinite(duration) && duration > 0) {
        video.style.opacity = String(Math.max(0, Math.min(1, currentTime / .5, (duration - currentTime) / .5)));
      }
      frame = requestAnimationFrame(update);
    };
    const ended = () => {
      video.style.opacity = '0';
      restart = setTimeout(() => { if (!disposed) { video.currentTime = 0; play(); } }, 100);
    };
    const sync = () => { setPlaying(!video.paused); if (!video.paused) { setShowPoster(false); setFailed(false); } };
    const motionChanged = () => { if (reducedMotion.matches) { video.pause(); setShowPoster(true); } else play(); };
    video.addEventListener('ended', ended);
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    reducedMotion.addEventListener('change', motionChanged);
    frame = requestAnimationFrame(update);
    if (!reducedMotion.matches) play();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(restart);
      video.removeEventListener('ended', ended);
      video.removeEventListener('play', sync);
      video.removeEventListener('pause', sync);
      reducedMotion.removeEventListener('change', motionChanged);
      video.pause();
    };
  }, []);

  const openPanel = (next: Panel) => { setPanel(next); setMenuOpen(false); dialogRef.current?.showModal(); };
  const toggleVideo = () => {
    const video = videoRef.current!;
    if (video.paused) void video.play().catch(() => setFailed(true));
    else video.pause();
  };
  const cta = 'rounded-full bg-black text-white transition-transform duration-300 hover:scale-[1.03]';

  return (
    <div className="hero-shell relative min-h-screen w-full overflow-hidden bg-background">
      <div className="video-layer z-0" aria-hidden="true">
        {(showPoster || failed) && <img src="./media/aethera-poster.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <video ref={videoRef} muted playsInline preload="auto" poster="./media/aethera-poster.jpg"
          className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0 }}
          onError={() => setFailed(true)}>
          <source src="./media/aethera.mp4" type="video/mp4" />
          <source src={sourceUrl} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </div>

      <header className="relative z-20">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-8 py-6">
          <a href="#home" className="font-display text-3xl tracking-tight text-black" aria-label="Aethera home">Aethera<sup className="relative -top-2 ml-0.5 text-xs">®</sup></a>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#home" className="text-sm text-black transition-colors" aria-current="page">Home</a>
            {(['Studio', 'About', 'Journal', 'Reach Us'] as Panel[]).map(item => <button key={item} onClick={() => openPanel(item)} className="text-sm text-muted transition-colors hover:text-black">{item}</button>)}
          </div>
          <div className="flex items-center gap-4">
            <button className={`${cta} px-6 py-2.5 text-sm max-[380px]:hidden`} onClick={() => openPanel('Begin Journey')}>Begin Journey</button>
            <button className="text-sm md:hidden" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close' : 'Menu'}</button>
          </div>
        </nav>
        {menuOpen && <nav id="mobile-menu" aria-label="Mobile navigation" className="absolute inset-x-6 top-20 flex flex-col gap-5 rounded-2xl border border-black/5 bg-white/95 p-6 shadow-lg backdrop-blur-xl md:hidden">
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          {(['Studio', 'About', 'Journal', 'Reach Us'] as Panel[]).map(item => <button key={item} className="text-left text-muted" onClick={() => openPanel(item)}>{item}</button>)}
        </nav>}
      </header>

      <main id="home" className="relative z-10 flex flex-col items-center justify-center px-6 pb-40 text-center" style={{ paddingTop: 'calc(8rem - 75px)' }}>
        <h1 className="hero-title animate-fade-rise max-w-7xl font-display text-5xl font-normal sm:text-7xl md:text-8xl">
          Beyond <em className="text-muted">silence,</em> we build<br className="hidden sm:block" /> <em className="text-muted">the eternal.</em>
        </h1>
        <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">Building platforms for brilliant minds, fearless makers, and thoughtful souls. Through the noise, we craft digital havens for deep work and pure flows.</p>
        <div className="animate-fade-rise-delay-2 mt-12"><button className={`${cta} px-14 py-5 text-base`} onClick={() => openPanel('Begin Journey')}>Begin Journey</button></div>
      </main>

      <footer className="absolute inset-x-0 bottom-0 z-10 mx-auto flex max-w-7xl items-end justify-between gap-5 px-8 py-7 text-[11px] text-muted">
        <a href="../" className="tracking-[.16em] transition-colors hover:text-black">EDYSTUDIO <span className="mx-2">/</span> 001</a>
        <button onClick={toggleVideo} className="rounded-full border border-black/10 bg-white/50 px-4 py-2 backdrop-blur-md transition-colors hover:bg-white" aria-label={playing ? 'Pause background video' : 'Play background video'}>{failed ? 'Retry film' : playing ? 'Ⅱ Pause film' : '▷ Play film'}</button>
      </footer>

      <dialog ref={dialogRef} aria-labelledby="panel-title" onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
        <div className="flex items-center justify-between gap-4"><span className="text-xs tracking-widest text-muted">AETHERA / {panel.toUpperCase()}</span><button onClick={() => dialogRef.current?.close()} aria-label="Close dialog" className="p-2 text-xl">×</button></div>
        <h2 id="panel-title" className="mt-8 font-display text-5xl leading-none">{panels[panel][0]}</h2>
        <p className="mt-6 text-sm leading-relaxed text-muted">{panels[panel][1]}</p>
        <a href="../" className="mt-8 inline-block rounded-full bg-black px-6 py-3 text-sm text-white">Explore EdyStudio ↗</a>
      </dialog>
    </div>
  );
}
