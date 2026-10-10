import { useLayoutEffect, useRef } from 'react';

type Option<T extends string> = { value: T; label: string };

/** A retargetable, critically damped selection indicator. */
export default function SegmentedControl<T extends string>({ label, value, options, onChange, className = '' }: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const position = useRef({ x: 0, width: 0, vx: 0, vw: 0, ready: false });

  useLayoutEffect(() => {
    const container = root.current!;
    const surface = indicator.current!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let previous = 0;
    let targetX = 0;
    let targetWidth = 0;
    const paint = () => {
      surface.style.transform = `translateX(${position.current.x}px)`;
      surface.style.width = `${position.current.width}px`;
    };
    const step = (time: number) => {
      // Small integration steps keep the spring stable after dropped frames.
      const dt = Math.min((time - previous) / 1000, 0.032);
      previous = time;
      const state = position.current;
      for (let i = 0; i < 4; i++) {
        const h = dt / 4;
        state.vx += (625 * (targetX - state.x) - 50 * state.vx) * h;
        state.vw += (625 * (targetWidth - state.width) - 50 * state.vw) * h;
        state.x += state.vx * h;
        state.width += state.vw * h;
      }
      if (Math.abs(targetX - state.x) + Math.abs(targetWidth - state.width) < 0.1 && Math.abs(state.vx) + Math.abs(state.vw) < 0.5) {
        state.x = targetX; state.width = targetWidth; state.vx = state.vw = 0;
        paint(); frame = 0;
      } else { paint(); frame = requestAnimationFrame(step); }
    };
    const measure = () => {
      const selected = container.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
      if (!selected) return;
      targetX = selected.offsetLeft;
      targetWidth = selected.offsetWidth;
      cancelAnimationFrame(frame);
      if (reduced.matches || !position.current.ready) {
        Object.assign(position.current, { x: targetX, width: targetWidth, vx: 0, vw: 0, ready: true });
        paint();
      } else { previous = performance.now(); frame = requestAnimationFrame(step); }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    reduced.addEventListener('change', measure);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); reduced.removeEventListener('change', measure); };
  }, [value, options]);

  return <div ref={root} className={`segmented-control ${className}`} role="group" aria-label={label}>
    <span ref={indicator} className="segmented-indicator" aria-hidden="true" />
    {options.map(option => <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}
