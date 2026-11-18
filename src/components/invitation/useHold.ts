import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Press-and-hold gesture. Progress fills while the pointer is down and drains when released.
 * Keyboard users (Enter / Space) and screen-reader activation complete it immediately.
 */
export function useHold(durationMs: number, onComplete: () => void, opts: { onStart?: () => void; disabled?: boolean } = {}) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const state = useRef({ p: 0, down: false, done: false, last: 0, raf: 0 });
  const cb = useRef({ onComplete, onStart: opts.onStart });
  useEffect(() => { cb.current = { onComplete, onStart: opts.onStart }; });

  const tick = useCallback((now: number) => {
    const s = state.current;
    const dt = s.last ? now - s.last : 16;
    s.last = now;
    s.p = Math.max(0, Math.min(1, s.p + (s.down ? dt / durationMs : -dt / (durationMs * 0.6))));
    setProgress(s.p);
    if (s.p >= 1 && !s.done) { s.done = true; s.down = false; setHolding(false); cb.current.onComplete(); return; }
    if (s.down || s.p > 0) s.raf = requestAnimationFrame(tick);
    else s.last = 0;
  }, [durationMs]);

  const start = useCallback(() => {
    const s = state.current;
    if (s.done || opts.disabled) return;
    cb.current.onStart?.();
    s.down = true; setHolding(true);
    cancelAnimationFrame(s.raf); s.last = 0; s.raf = requestAnimationFrame(tick);
  }, [tick, opts.disabled]);
  const stop = useCallback(() => { state.current.down = false; setHolding(false); }, []);
  const finish = useCallback(() => {
    const s = state.current;
    if (s.done || opts.disabled) return;
    cb.current.onStart?.();
    s.done = true; s.down = false; s.p = 1; setProgress(1); setHolding(false); cb.current.onComplete();
  }, [opts.disabled]);
  const reset = useCallback(() => { const s = state.current; cancelAnimationFrame(s.raf); s.p = 0; s.down = false; s.done = false; s.last = 0; setProgress(0); setHolding(false); }, []);

  useEffect(() => () => cancelAnimationFrame(state.current.raf), []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => { if (e.button !== 0) return; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); start(); },
    onPointerUp: stop, onPointerCancel: stop, onLostPointerCapture: stop,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); finish(); } },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    // A click without a hold (e.g. a screen reader's activate action has no pointerdown) completes it.
    onClick: (e: React.MouseEvent) => { if (e.detail === 0) finish(); },
  };
  return { progress, holding, handlers, reset, finish };
}
