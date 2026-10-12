import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export default function AboutSection() {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="bg-black pt-32 md:pt-44 pb-10 md:pb-14 px-6 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />
      <div className="relative max-w-6xl mx-auto">
        <motion.p
          className="text-white/40 text-sm tracking-widest uppercase mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          About Us
        </motion.p>
        <motion.h2
          className="text-4xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight max-w-4xl"
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <span className="italic text-white/60" style={{ fontFamily: "'Instrument Serif', serif" }}>
            Pioneering ideas
          </span>{' '}
          for
          <br className="hidden md:block" />{' '}
          <span className="italic text-white/60" style={{ fontFamily: "'Instrument Serif', serif" }}>
            minds that create, build, and inspire.
          </span>
        </motion.h2>
      </div>
    </section>
  )
}
