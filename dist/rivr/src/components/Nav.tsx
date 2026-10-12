import { ChevronDown } from './icons';

const NAV_ITEMS: { label: string; hasChevron?: boolean }[] = [
  { label: 'Platform' },
  { label: 'Features', hasChevron: true },
  { label: 'Projects' },
  { label: 'Community' },
  { label: 'Contact' },
];

export function Nav() {
  return (
    <nav
      aria-label="RIVR primary"
      className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-[120px] py-4"
    >
      {/* Logo */}
      <a
        href="#"
        className="font-schibsted text-[24px] font-semibold tracking-navlogo text-black select-none"
        style={{ letterSpacing: '-1.44px' }}
      >
        Logoipsum
      </a>

      {/* Center menu */}
      <ul className="flex items-center gap-9">
        {NAV_ITEMS.map((item) => (
          <li key={item.label}>
            <a
              href={`#${item.label.toLowerCase()}`}
              className="font-schibsted text-[16px] font-medium tracking-navlink text-black/85 transition-colors hover:text-black"
              style={{ letterSpacing: '-0.2px' }}
            >
              <span className="inline-flex items-center gap-1.5">
                {item.label}
                {item.hasChevron && (
                  <ChevronDown size={14} className="text-black/70" />
                )}
              </span>
            </a>
          </li>
        ))}
      </ul>

      {/* Right side buttons */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="h-10 w-[82px] rounded-full bg-transparent font-schibsted text-[15px] font-medium text-black/80 transition-colors hover:text-black"
          style={{ letterSpacing: '-0.2px' }}
        >
          Sign Up
        </button>
        <button
          type="button"
          className="h-10 w-[101px] rounded-full bg-black font-schibsted text-[15px] font-medium text-white transition-transform active:scale-[0.97]"
          style={{ letterSpacing: '-0.2px' }}
        >
          Log In
        </button>
      </div>
    </nav>
  );
}
