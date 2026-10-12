import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Microphone,
  Paperclip,
  Search,
  Sparkle,
  Star,
} from './icons';

// ---------------------------------------------------------------------------
// Hero — content sitting on top of the looping video background.
// ---------------------------------------------------------------------------

const MAX_CHARS = 3000;

function Badge() {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full bg-[#0e1311] py-1.5 pl-1.5 pr-3 shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
      aria-label="Discover what's new in RIVR"
    >
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#f8f8f8] px-2 text-black">
        <Star size={12} className="text-black" />
        <span className="font-inter text-[11px] font-medium leading-none">
          New
        </span>
      </span>
      <span className="font-inter text-[14px] font-normal leading-none text-white/90">
        Discover what&apos;s possible
      </span>
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col items-center gap-[34px] text-center">
      <Badge />
      <h1
        className="font-fustat text-[80px] font-bold text-black"
        style={{
          letterSpacing: '-4.8px',
          lineHeight: 1,
        }}
      >
        Transform Data Quickly
      </h1>
      <p
        className="font-fustat text-[20px] font-medium text-[#505050]"
        style={{
          letterSpacing: '-0.4px',
          maxWidth: '736px',
          width: '542px',
        }}
      >
        Upload your information and get powerful insights right away. Work
        smarter and achieve goals effortlessly.
      </p>
    </div>
  );
}

function SearchBox() {
  const [value, setValue] = useState('');
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow the textarea up to a reasonable cap
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px';
  }, [value]);

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    // Hook for future API call — for now just clear.
    setValue('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full max-w-[728px] rounded-[18px] p-3"
      style={{
        background: 'rgba(0,0,0,0.24)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        height: '200px',
      }}
      aria-label="Ask RIVR a question"
    >
      <div className="flex h-full flex-col justify-between">
        {/* Top row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="font-schibsted text-[12px] font-medium text-white">
              60/450 credits
            </span>
            <button
              type="button"
              className="rounded-full px-2.5 py-1 font-schibsted text-[11px] font-medium text-black transition-transform active:scale-95"
              style={{ background: 'rgba(90,225,76,0.89)' }}
            >
              Upgrade
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkle size={14} className="text-white/90" />
            <span className="font-schibsted text-[12px] font-medium text-white/90">
              Powered by GPT-4o
            </span>
          </div>
        </div>

        {/* Main input area */}
        <div className="rounded-[12px] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <div className="flex items-end gap-3">
            <textarea
              ref={taRef}
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Type question..."
              rows={1}
              className="block w-full resize-none border-0 bg-transparent font-inter text-[16px] font-normal leading-snug text-black outline-none placeholder:text-[rgba(0,0,0,0.6)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              aria-label="Submit question"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-black text-white transition-transform hover:scale-105 active:scale-95"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ActionButton icon={<Paperclip size={14} />} label="Attach" />
            <ActionButton icon={<Microphone size={14} />} label="Voice" />
            <ActionButton icon={<Search size={14} />} label="Prompts" />
          </div>
          <span className="font-schibsted text-[12px] font-normal text-white/70">
            {value.length.toLocaleString()}/{MAX_CHARS.toLocaleString()}
          </span>
        </div>
      </div>
    </form>
  );
}

function ActionButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md bg-[#f8f8f8] px-2.5 py-1.5 font-inter text-[12px] font-medium text-black/80 transition-colors hover:bg-[#efefef]"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function Hero() {
  return (
    <section
      aria-label="RIVR hero"
      className="relative z-20 mx-auto flex w-full max-w-[1200px] flex-col items-center px-[120px] pb-20 pt-[160px] text-center"
    >
      {/* pb-20 = footer breathing room. pt-[160px] = nav(16) + gap(60) + first content. */}
      <div className="-mt-[50px] flex flex-col items-center gap-[44px]">
        <Header />
        <SearchBox />
      </div>
    </section>
  );
}
