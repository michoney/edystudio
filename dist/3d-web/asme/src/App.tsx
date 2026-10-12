import { useEffect, useRef } from 'react'
import { ArrowRight, Bird, Camera, Globe } from 'lucide-react'
import AboutSection from './components/AboutSection'
import FeaturedVideoSection from './components/FeaturedVideoSection'
import PhilosophySection from './components/PhilosophySection'
import ServicesSection from './components/ServicesSection'

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4'

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let raf = 0
    let timer: number | undefined

    const fadeTo = (target: number, ms = 500) => {
      cancelAnimationFrame(raf)
      const from = parseFloat(v.style.opacity || '0')
      const t0 = performance.now()
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / ms)
        v.style.opacity = String(from + (target - from) * p)
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }

    const onCanPlay = () => {
      v.play().catch(() => {})
      fadeTo(1, 500)
    }
    const onTimeUpdate = () => {
      if (v.duration && v.duration - v.currentTime <= 0.55 && v.style.opacity !== '0') fadeTo(0, 500)
    }
    const onEnded = () => {
      v.style.opacity = '0'
      timer = window.setTimeout(() => {
        v.currentTime = 0
        v.play().catch(() => {})
        fadeTo(1, 500)
      }, 100)
    }

    v.addEventListener('canplay', onCanPlay)
    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('ended', onEnded)
    return () => {
      cancelAnimationFrame(raf)
      if (timer) window.clearTimeout(timer)
      v.removeEventListener('canplay', onCanPlay)
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('ended', onEnded)
    }
  }, [])

  return (
    <div className="min-h-screen overflow-hidden relative flex flex-col bg-black">
      {/* Section 1 — Hero */}
      <video
        ref={videoRef}
        src={HERO_VIDEO}
        className="absolute inset-0 w-full h-full object-cover object-bottom"
        style={{ opacity: 0 }}
        muted
        autoPlay
        playsInline
        preload="auto"
      />

      <nav className="relative z-20 px-6 py-6">
        <div className="liquid-glass rounded-full max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Globe size={24} className="text-white" />
            <span className="text-white font-semibold text-lg ml-2">Asme</span>
            <div className="hidden md:flex gap-8 ml-8">
              <a href="#" className="text-white/80 hover:text-white text-sm font-medium">
                Features
              </a>
              <a href="#" className="text-white/80 hover:text-white text-sm font-medium">
                Pricing
              </a>
              <a href="#" className="text-white/80 hover:text-white text-sm font-medium">
                About
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-white text-sm font-medium">Sign Up</button>
            <button className="liquid-glass rounded-full px-6 py-2 text-white text-sm font-medium">Login</button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[20%] gap-6">
        <h1
          className="text-7xl md:text-8xl lg:text-9xl text-white tracking-tight whitespace-nowrap"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Know it <em className="italic">all</em>
        </h1>

        <div className="max-w-xl w-full">
          <div className="liquid-glass rounded-full pl-6 pr-2 py-2 flex items-center gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-transparent outline-none text-white placeholder:text-white/40 text-sm"
            />
            <button className="bg-white rounded-full p-3 text-black" aria-label="Submit">
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        <p className="text-white text-sm leading-relaxed px-4 max-w-xl">
          Stay updated with the latest news and insights. Subscribe to our newsletter today and never miss out on
          exciting updates.
        </p>

        <button className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors">
          Manifesto
        </button>
      </div>

      <div className="relative z-10 flex justify-center gap-4 pb-12">
        <button className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all" aria-label="Instagram">
          <Camera size={20} />
        </button>
        <button className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all" aria-label="Twitter">
          <Bird size={20} />
        </button>
        <button className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all" aria-label="Website">
          <Globe size={20} />
        </button>
      </div>

      {/* Section 2 — About */}
      <AboutSection />
      {/* Section 3 — Featured video */}
      <FeaturedVideoSection />
      {/* Section 4 — Philosophy */}
      <PhilosophySection />
      {/* Section 5 — Services */}
      <ServicesSection />
    </div>
  )
}
