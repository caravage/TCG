import { useEffect, useRef } from 'react';

/**
 * Tracks the pointer over an element and exposes it as CSS variables used by the
 * card effects: --mx/--my (pointer, %), --rx/--ry (tilt), --hov (0-1), --dist (0-1).
 */
export function useTilt<T extends HTMLElement>(enabled = true, strength = 1) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let raf = 0;

    const apply = (px: number, py: number, hov: number) => {
      el.style.setProperty('--mx', `${(px * 100).toFixed(2)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(2)}%`);
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
      el.style.setProperty('--rx', `${((0.5 - py) * 22 * strength).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${((px - 0.5) * 26 * strength).toFixed(2)}deg`);
      el.style.setProperty('--hov', String(hov));
      el.style.setProperty('--dist', Math.min(1, Math.hypot(px - 0.5, py - 0.5) * 2).toFixed(3));
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => apply(px, py, 1));
    };
    const onEnter = () => el.classList.add('is-hover');
    const onLeave = () => {
      cancelAnimationFrame(raf);
      el.classList.remove('is-hover');
      apply(0.5, 0.5, 0);
    };

    apply(0.5, 0.5, 0);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled, strength]);

  return ref;
}
