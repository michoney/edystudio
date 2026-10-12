import type { ReactNode } from 'react';
type IconProps = { className?: string };
function Stroke({ children, className = 'h-5 w-5' }: IconProps & { children: ReactNode }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
function Filled({ path, className = 'h-5 w-5' }: IconProps & { path: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor"><path d={path} /></svg>;
}
export const ArrowUpRight = (p: IconProps) => <Stroke {...p}><path d="M7 17L17 7M7 7h10v10" /></Stroke>;
export const Play = (p: IconProps) => <Filled {...p} path="M6 4 20 12 6 20 6 4Z" />;
export const ClockIcon = (p: IconProps) => <Stroke {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Stroke>;
export const GlobeIcon = (p: IconProps) => <Stroke {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a18 18 0 0 1 0 18M12 3a18 18 0 0 0 0 18" /></Stroke>;
export const ImageIcon = (p: IconProps) => <Filled {...p} path="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 6A1.5 1.5 0 1 1 8.5 9a1.5 1.5 0 0 1 0-3ZM5 18l4.5-6 3.5 4.5 2.5-3L19 18H5Z" />;
export const MovieIcon = (p: IconProps) => <Filled {...p} path="m18 4 2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H3v16h18V4h-3ZM7 11h10v2H7v-2Zm0 4h7v2H7v-2Z" />;
export const LightbulbIcon = (p: IconProps) => <Filled {...p} path="M9 21h6v-1H9v1Zm3-19a7 7 0 0 0-4 12.74V18h8v-3.26A7 7 0 0 0 12 2Zm2 11.7V16h-4v-2.3A5 5 0 1 1 14 13.7Z" />;
