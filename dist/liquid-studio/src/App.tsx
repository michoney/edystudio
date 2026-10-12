import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import BlurText from './BlurText';
import FadingVideo from './FadingVideo';
import { ArrowUpRight, Play, ClockIcon, GlobeIcon, ImageIcon, MovieIcon, LightbulbIcon } from './Icons';

const heroVideo = './media/hero.mp4';
const capabilitiesVideo = './media/capabilities.mp4';
const cards = [
  { title: 'Design', Icon: ImageIcon, tags: ['Brand Systems', 'Art Direction', 'Visual Identity', 'Motion'], body: 'We shape identities and interfaces that feel unmistakably yours — typographic systems, component libraries, and art-directed pages that scale without losing soul.' },
  { title: 'Engineering', Icon: MovieIcon, tags: ['React', 'Next.js', 'Headless CMS', 'Edge-Ready'], body: 'Production-grade front-ends built on modern stacks. Performant, accessible, and instrumented — with code your team will enjoy extending long after launch.' },
  { title: 'Growth', Icon: LightbulbIcon, tags: ['SEO', 'Analytics', 'A/B Testing', 'Retention'], body: 'Launch is the starting line. We partner with your team on conversion, content, and iteration loops that turn a beautiful site into a compounding asset.' },
];

function Reveal({ children, delay = 0, className = '', inView = false }: { children: ReactNode; delay?: number; className?: string; inView?: boolean }) {
  const reduce = useReducedMotion();
  const visible = { filter: 'blur(0px)', opacity: 1, y: 0, transitionEnd: { filter: 'none' } };
  return <motion.div className={className} initial={reduce ? false : { filter: 'blur(10px)', opacity: 0, y: 20 }}
    animate={inView ? undefined : visible} whileInView={inView ? visible : undefined} viewport={{ once: true, amount: .1 }}
    transition={{ duration: reduce ? 0 : .8, ease: 'easeOut', delay: reduce ? 0 : delay }}>{children}</motion.div>;
}

export default function App() {
  const dialog = useRef<HTMLDialogElement>(null);
  const reel = useRef<HTMLVideoElement>(null);
  const [panel, setPanel] = useState<'project' | 'reel' | 'journal'>('project');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [paused, setPaused] = useState(false);
  const [saved, setSaved] = useState(false);
  const open = (kind: typeof panel) => { setPanel(kind); setMenu(false); setDialogOpen(true); setSaved(false); dialog.current?.showModal(); };
  const close = () => { reel.current?.pause(); dialog.current?.close(); setDialogOpen(false); };
  const saveBrief = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const blob = new Blob([`PROJECT BRIEF\n\nName: ${data.get('name')}\nEmail: ${data.get('email')}\n\n${data.get('brief')}\n`], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = href; link.download = 'studio-project-brief.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000); setSaved(true);
  };
  return <>
    <nav aria-label="Main navigation" className="fixed left-0 right-0 top-4 z-50 flex items-center justify-between px-8 lg:px-16">
      <a href="#studio" aria-label="Studio home" className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full font-heading text-2xl italic">a</a>
      <div className="liquid-glass hidden items-center rounded-full px-1.5 py-1.5 md:flex">
        <a href="../" className="px-3 py-2 text-sm font-medium text-white/90">Work</a>
        <a href="#studio" className="px-3 py-2 text-sm font-medium text-white/90">Studio</a>
        <a href="#capabilities" className="px-3 py-2 text-sm font-medium text-white/90">Services</a>
        <button onClick={() => open('journal')} className="px-3 py-2 text-sm font-medium text-white/90">Journal</button>
        <button onClick={() => open('project')} className="px-3 py-2 text-sm font-medium text-white/90">Contact</button>
        <button onClick={() => open('project')} className="ml-2 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90">Start a Project <ArrowUpRight /></button>
      </div>
      <div className="hidden h-12 w-12 md:block" />
      <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="mobile-menu" className="liquid-glass rounded-full px-5 py-3 text-sm md:hidden">{menu ? 'Close' : 'Menu'}</button>
      {menu && <div id="mobile-menu" className="absolute left-8 right-8 top-16 flex flex-col gap-4 rounded-2xl border border-white/20 bg-black/90 p-6 backdrop-blur-xl md:hidden">
        <a href="../">Work</a><a href="#studio" onClick={() => setMenu(false)}>Studio</a><a href="#capabilities" onClick={() => setMenu(false)}>Services</a>
        <button className="text-left" onClick={() => open('journal')}>Journal</button><button className="text-left" onClick={() => open('project')}>Contact</button>
      </div>}
    </nav>

    <main>
      <section id="studio" aria-labelledby="hero-title" className="hero relative h-screen overflow-hidden bg-black">
        <FadingVideo src={heroVideo} poster="./media/hero-poster.jpg" paused={paused || dialogOpen} className="absolute left-1/2 top-0 z-0 -translate-x-1/2 object-cover object-top" style={{ width: '120%', height: '120%' }} />
        <div className="hero-shade pointer-events-none absolute inset-0 z-0" />
        <div className="relative z-10 flex h-full flex-col">
          <div className="hero-main flex flex-1 flex-col items-center justify-center px-4 pt-24 text-center">
            <Reveal delay={.4}><div className="booking liquid-glass flex items-center gap-2 rounded-full p-1.5 pr-4 text-xs"><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-black">New</span><span>Booking Q3 2026 engagements — limited capacity</span></div></Reveal>
            <h1 id="hero-title" className="hero-headline mt-6 max-w-3xl font-heading text-6xl italic leading-[.8] tracking-[-4px] md:text-7xl lg:text-[5.5rem]"><BlurText text="Crafted Digital Experiences Built to Outlast Trends" /></h1>
            <Reveal delay={.8} className="hero-copy mt-4 max-w-2xl text-sm font-light leading-tight md:text-base"><p>We are a small studio of designers and engineers shaping brand-defining websites for ambitious companies. Precise typography, cinematic motion, and code you can be proud of.</p></Reveal>
            <Reveal delay={1.1} className="hero-actions mt-6 flex items-center gap-6 text-sm"><button onClick={() => open('project')} className="liquid-glass-strong glass-button flex items-center gap-2 rounded-full px-5 py-2.5">Start a Project <ArrowUpRight /></button><button onClick={() => open('reel')} className="flex items-center gap-2 transition-opacity hover:opacity-80">Watch Showreel <Play className="h-3 w-3" /></button></Reveal>
            <Reveal delay={1.3} className="hero-stats mt-8 flex gap-4 text-left">
              <div className="stat-card liquid-glass w-[220px] rounded-[1.25rem] p-5"><ClockIcon /><p className="stat-number mt-4 font-heading text-4xl italic leading-none tracking-[-1px]">6 Weeks</p><p className="mt-2 text-xs font-light leading-tight text-white/90">Average End-to-End Launch Time</p></div>
              <div className="stat-card liquid-glass w-[220px] rounded-[1.25rem] p-5"><GlobeIcon /><p className="stat-number mt-4 font-heading text-4xl italic leading-none tracking-[-1px]">140+</p><p className="mt-2 text-xs font-light leading-tight text-white/90">Brands Shipped Across Four Continents</p></div>
            </Reveal>
          </div>
          <Reveal delay={1.4} className="trust-bar flex flex-col items-center gap-4 pb-8">
            <div className="trust-label liquid-glass rounded-full px-4 py-2 text-xs font-light">Trusted by founders, operators, and creative directors worldwide</div>
            <div className="flex items-center gap-8 sm:gap-12 md:gap-16">{['Aeon', 'Vela', 'Apex', 'Orbit', 'Zeno'].map(name => <span key={name} className="font-heading text-2xl italic tracking-tight md:text-3xl">{name}</span>)}</div>
          </Reveal>
        </div>
      </section>

      <section id="capabilities" aria-labelledby="capabilities-title" className="relative min-h-screen overflow-hidden bg-black">
        <FadingVideo src={capabilitiesVideo} poster="./media/capabilities-poster.jpg" paused={paused || dialogOpen} className="absolute inset-0 z-0 h-full w-full object-cover" />
        <div className="capabilities-shade pointer-events-none absolute inset-0 z-0" />
        <div className="relative z-10 flex min-h-screen flex-col px-8 pb-10 pt-24 md:px-16 lg:px-20">
          <Reveal inView className="mb-auto"><p className="mb-6 text-sm text-white/80">// Capabilities</p><h2 id="capabilities-title" className="font-heading text-6xl italic leading-[.9] tracking-[-3px] md:text-7xl lg:text-[6rem]">Studio craft,<br />end to end</h2></Reveal>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">{cards.map(({ title, Icon, tags, body }, index) => <Reveal key={title} inView delay={index * .12}>
            <article className="liquid-glass flex h-full min-h-[360px] flex-col rounded-[1.25rem] p-6">
              <div className="flex items-start justify-between gap-3"><div className="liquid-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-[.75rem]"><Icon /></div><div className="flex flex-wrap justify-end gap-1.5">{tags.map(tag => <span key={tag} className="liquid-glass whitespace-nowrap rounded-full px-3 py-1 text-[11px] text-white/90">{tag}</span>)}</div></div>
              <div className="flex-1" /><h3 className="mt-10 font-heading text-3xl italic leading-none tracking-[-1px] md:text-4xl">{title}</h3><p className="mt-4 max-w-[32ch] text-sm font-light leading-snug text-white/90">{body}</p>
            </article>
          </Reveal>)}</div>
          <div className="mt-8 flex items-center justify-between gap-4 text-[10px] tracking-[.15em] text-white/80"><a href="../">← EDYSTUDIO / 002</a><button onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? 'PLAY BACKGROUNDS' : 'PAUSE BACKGROUNDS'}</button></div>
        </div>
      </section>
    </main>

    <dialog ref={dialog} className={panel === 'reel' ? 'showreel' : ''} aria-labelledby="dialog-title" onCancel={close} onClose={() => { reel.current?.pause(); setDialogOpen(false); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="mb-6 flex items-center justify-between"><span className="text-xs tracking-widest text-white/80">LIQUID STUDIO / 002</span><button onClick={close} className="px-2 text-2xl" aria-label="Close dialog">×</button></div>
      <h2 id="dialog-title" className="mb-6 font-heading text-5xl italic tracking-tight">{panel === 'project' ? 'Tell us what’s next.' : panel === 'reel' ? 'A study in motion.' : 'Behind the glass.'}</h2>
      {panel === 'project' && <form onSubmit={saveBrief} className="space-y-4"><p className="text-sm font-light text-white/80">Shape your next project. Save a brief to share with your team.</p><label className="block text-sm">Your name<input name="name" autoComplete="name" required className="dialog-field mt-2" /></label><label className="block text-sm">Email<input name="email" type="email" autoComplete="email" required className="dialog-field mt-2" /></label><label className="block text-sm">What would you like to create?<textarea name="brief" required rows={3} className="dialog-field mt-2" /></label><button className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black">Save project brief ↗</button><p className="text-xs text-white/80" role="status">{saved ? 'Your brief has been downloaded. Nothing has been sent.' : 'This showcase saves a local brief; no information is sent.'}</p></form>}
      {panel === 'reel' && dialogOpen && <video ref={reel} src={heroVideo} poster="./media/hero-poster.jpg" autoPlay muted playsInline controls className="max-h-[65svh] w-full rounded-xl object-contain" />}
      {panel === 'journal' && <><p className="mb-4 text-xs text-white/80">STUDIO NOTE / 001</p><p className="text-base font-light leading-relaxed text-white/90">Precise typography. Cinematic motion. Interfaces that let the work speak. This experiment pairs liquid-glass surfaces with two moving worlds, exploring how light and depth can shape a digital experience.</p><a href="#capabilities" onClick={close} className="liquid-glass mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm">Explore our capabilities <ArrowUpRight /></a></>}
    </dialog>
  </>;
}
