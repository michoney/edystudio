import { useEffect, useState } from 'react'
import { Flower2 } from 'lucide-react'

const entrance = 'cubic-bezier(0.16, 1, 0.3, 1)'
const overlayEase = 'cubic-bezier(0.76, 0, 0.24, 1)'
const menuLinks = ['Home', 'Story', 'Collection', 'Inquire']

export default function App() {
  const [mounted, setMounted] = useState(false)
  const [heroMounted, setHeroMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const navTimer = window.setTimeout(() => setMounted(true), 100)
    const heroTimer = window.setTimeout(() => setHeroMounted(true), 300)
    return () => { window.clearTimeout(navTimer); window.clearTimeout(heroTimer) }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const navEntrance = (delay: number) => ({
    transition: `opacity 700ms ${entrance} ${mounted ? delay : 0}ms, transform 700ms ${entrance} ${mounted ? delay : 0}ms`,
  })
  const heroEntrance = (delay: number) => ({
    transition: `opacity 900ms ${entrance} ${heroMounted ? delay : 0}ms, transform 900ms ${entrance} ${heroMounted ? delay : 0}ms`,
  })

  return <main className="min-h-screen bg-black">
    <div className={`fixed inset-0 z-40 bg-black flex flex-col items-center justify-center transition-all duration-700 ${open ? 'opacity-100 visible' : 'opacity-0 invisible'}`} style={{ transitionTimingFunction: overlayEase }}>
      <nav className="flex flex-col items-center gap-8 text-center">
        {menuLinks.map((link, index) => <a key={link} href="#" onClick={() => setOpen(false)} className={`text-white font-instrument text-4xl md:text-6xl hover:opacity-60 transition-all duration-[600ms] ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionTimingFunction: overlayEase, transitionDelay: open ? `${150 + index * 80}ms` : '0ms' }}>{link}</a>)}
      </nav>
    </div>

    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-md' : 'bg-transparent'}`}>
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 flex items-center justify-between h-16 md:h-20">
        <a href="#" className={`text-white text-xl md:text-2xl font-semibold tracking-tight z-50 transition-all ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`} style={navEntrance(0)}>Aurevon</a>
        <button type="button" onClick={() => setOpen(value => !value)} className={`hidden md:flex px-5 py-2 rounded-full border border-white/20 text-white/90 text-sm hover:bg-white/10 items-center gap-2 transition-all ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`} style={navEntrance(200)}>{open ? 'Close' : 'Navigate'}</button>
        <div className={`hidden md:flex transition-all ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`} style={navEntrance(400)}><Flower2 className="w-7 h-7 text-white/90" /></div>
        <button type="button" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(value => !value)} className={`md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 z-50 transition-all ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`} style={navEntrance(200)}>
          <span className={`w-6 h-[2px] bg-white transition-transform duration-500 ${open ? 'rotate-45 translate-y-[4px]' : ''}`} style={{ transitionTimingFunction: overlayEase }} />
          <span className={`w-6 h-[2px] bg-white transition-transform duration-500 ${open ? '-rotate-45 -translate-y-[4px]' : ''}`} style={{ transitionTimingFunction: overlayEase }} />
        </button>
      </div>
    </header>

    <section className="relative w-full h-screen overflow-hidden flex items-end justify-center">
      <div className={`absolute inset-0 transition-all duration-[1400ms] ${heroMounted ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`} style={{ transitionTimingFunction: entrance }}>
        <video src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260819_212700_3bb9329b-5c50-4257-a09b-ca85cf3654a3.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover" />
      </div>
      <div className="relative z-10 text-center px-6 pb-16 md:pb-24 max-w-4xl mx-auto">
        <h1 className={`font-instrument text-white text-[2.5rem] leading-[0.95] sm:text-5xl md:text-6xl lg:text-7xl mb-5 md:mb-6 transition-all ${heroMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={heroEntrance(400)}>A carefully curated<br className="hidden sm:block" /> collection beyond compare</h1>
        <p className={`text-white/70 text-base md:text-lg mb-8 md:mb-10 max-w-md mx-auto transition-all ${heroMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={heroEntrance(600)}>Reserve your place in our private gallery.</p>
        <a href="#" className={`inline-block px-8 py-3.5 bg-white text-black text-sm md:text-base font-medium rounded-full hover:bg-white/90 transition-all ${heroMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={heroEntrance(800)}>Join the waitlist</a>
      </div>
    </section>
  </main>
}
