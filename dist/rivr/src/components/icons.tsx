// ---------------------------------------------------------------------------
// Icons — all hand-rolled inline SVG paths so the bundle stays tiny.
// Stroke-based, currentColor-aware. Each icon is a small React component.
// ---------------------------------------------------------------------------

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
    ...rest,
  };
}

export function ChevronDown(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowUp(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 19V5M5 12l7-7 7 7"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Star(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 3.6l2.7 5.6 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6L3.2 10.1l6.1-.9L12 3.6z"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sparkle(props: IconProps) {
  // Four-pointed AI sparkle (used in the "Powered by GPT-4o" pill)
  return (
    <svg {...base(props)}>
      <path
        d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z"
        fill="currentColor"
      />
      <circle cx={18.5} cy={5.5} r={0.9} fill="currentColor" />
      <circle cx={5.5} cy={18.5} r={0.9} fill="currentColor" />
    </svg>
  );
}

export function Paperclip(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l7.5-7.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Microphone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect
        x={9}
        y={3}
        width={6}
        height={11}
        rx={3}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Search(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx={11} cy={11} r={6.5} stroke="currentColor" strokeWidth={1.5} />
      <path
        d="M20 20l-3.5-3.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
