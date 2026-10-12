import { Hero } from './components/Hero';
import { Nav } from './components/Nav';
import { VideoBackground } from './components/VideoBackground';

export default function App() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      {/* Full-screen looping video */}
      <VideoBackground />

      {/* A subtle white tint so foreground text remains readable on any frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-white/15"
      />

      {/* Top navigation */}
      <Nav />

      {/* Hero content */}
      <Hero />

      {/* Footer strip — minimal so the page still feels grounded */}
      <footer className="relative z-20 mx-auto flex w-full max-w-[1200px] items-center justify-between px-[120px] py-10">
        <p className="font-fustat text-[14px] font-medium text-black/60">
          © 2026 RIVR. All rights reserved.
        </p>
        <div className="flex items-center gap-6 font-schibsted text-[13px] font-medium text-black/60">
          <a href="#privacy" className="hover:text-black">
            Privacy
          </a>
          <a href="#terms" className="hover:text-black">
            Terms
          </a>
          <a href="#support" className="hover:text-black">
            Support
          </a>
        </div>
      </footer>
    </div>
  );
}
