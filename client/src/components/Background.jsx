import { useEffect, useRef } from 'react';

import { useDocumentVisible, usePrefersReducedMotion } from '../hooks';
import MarineLife from './MarineLife';

/**
 * Ambient live background.
 *
 * Layers, back to front:
 *   field   — very slow colour wash that drifts and breathes
 *   blobs   — three soft light sources on long, offset drift cycles
 *   aurora  — a wide conic ribbon rotating behind the grid
 *   grid    — faint lattice that pans almost imperceptibly
 *   sea     — fish, a school, manta rays, a sea turtle, jellyfish and bubbles
 *   spot    — soft light that eases towards the pointer (fine pointers only)
 *
 * Everything is transform/opacity only, so it stays on the compositor. The
 * whole thing pauses when the tab is hidden, and reduced-motion visitors get a
 * static wash with no animations at all. Contrast never changes: the layers sit
 * behind `main` (z-index 1) and stay well under 15% opacity.
 */
export default function Background() {
  const visible = useDocumentVisible();
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef(null);

  const live = visible && !reducedMotion;

  // Pointer spotlight: eased with a rAF loop so the light trails the cursor.
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (!live) return undefined;
    if (typeof window.matchMedia !== 'function') return undefined;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;

    const target = { x: 50, y: 30 };
    const current = { x: 50, y: 30 };
    let frame = 0;

    const onMove = (event) => {
      target.x = (event.clientX / window.innerWidth) * 100;
      target.y = (event.clientY / window.innerHeight) * 100;
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.05;
      current.y += (target.y - current.y) * 0.05;
      node.style.setProperty('--spot-x', `${current.x.toFixed(2)}%`);
      node.style.setProperty('--spot-y', `${current.y.toFixed(2)}%`);
      frame = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [live]);

  return (
    <div ref={ref} className={`app-bg ${live ? 'is-live' : 'is-paused'}`} aria-hidden="true">
      <div className="app-bg__field" />
      <div className="app-bg__blob app-bg__blob--1" />
      <div className="app-bg__blob app-bg__blob--2" />
      <div className="app-bg__blob app-bg__blob--3" />
      <div className="app-bg__aurora" />
      <div className="app-bg__grid" />
      <MarineLife />
      <div className="app-bg__spot" />
    </div>
  );
}
