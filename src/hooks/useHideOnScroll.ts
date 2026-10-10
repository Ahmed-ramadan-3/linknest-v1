import { useEffect, useState } from 'react';

/** Dispatched on window to bring a hidden search bar back (for example from a keyboard shortcut). */
export const REVEAL_SEARCH_EVENT = 'linknest:reveal-search';

interface Options {
  /** Scroll distance (px) in one direction before the state flips. Avoids flicker from tiny moves. */
  threshold?: number;
  /** Always visible this close to the top of the page. */
  topOffset?: number;
}

/**
 * True while the user is reading further down the page, false when they scroll back up or are near
 * the top. Uses one passive scroll listener, throttled to animation frames.
 */
export function useHideOnScroll({ threshold = 10, topOffset = 90 }: Options = {}): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = Math.max(0, window.scrollY);
    let frame = 0;
    let state = false;

    const apply = (next: boolean) => {
      if (next === state) return;
      state = next;
      setHidden(next);
    };

    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      if (y <= topOffset) {
        apply(false);
        lastY = y;
      } else if (delta > threshold) {
        apply(true);
        lastY = y;
      } else if (delta < -threshold) {
        apply(false);
        lastY = y;
      }
    };

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    const reveal = () => apply(false);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener(REVEAL_SEARCH_EVENT, reveal);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener(REVEAL_SEARCH_EVENT, reveal);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [threshold, topOffset]);

  return hidden;
}
