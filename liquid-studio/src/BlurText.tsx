import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function BlurText({ text, className = '' }: { text: string; className?: string }) {
  const container = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: .1 });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return <span ref={container} className={`flex flex-wrap justify-center gap-y-[.1em] ${className}`} aria-label={text}>
    {text.split(' ').map((word, index) => <motion.span key={`${word}-${index}`} aria-hidden="true" style={{ display: 'inline-block', marginRight: '.28em' }}
      initial={reduce ? false : { filter: 'blur(10px)', opacity: 0, y: 50 }}
      animate={visible || reduce ? { filter: 'blur(0px)', opacity: 1, y: 0 } : undefined}
      transition={{ duration: reduce ? 0 : .7, delay: reduce ? 0 : index * .1, ease: 'easeOut' }}>{word}</motion.span>)}
  </span>;
}
