import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTilt } from './useTilt';

interface Props {
  god: boolean;
  disabled: boolean;
  /** Colour of the light escaping the pack once torn (hints the best card). */
  glow: string;
  onTorn: () => void;
}

/** A foil booster that the player tears open by dragging across its top edge (or with a click). */
export function PackVisual({ god, disabled, glow, onTorn }: Props) {
  const tiltRef = useTilt<HTMLDivElement>(!disabled);
  const [progress, setProgress] = useState(0);
  const [torn, setTorn] = useState(false);
  const drag = useRef<{ x: number; y: number; moved: number } | null>(null);
  const auto = useRef(0);

  const complete = () => {
    if (torn) return;
    setProgress(1);
    setTorn(true);
    setTimeout(onTorn, 60);
  };

  useEffect(() => () => cancelAnimationFrame(auto.current), []);

  const autoTear = () => {
    const start = performance.now();
    const from = progress;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 520);
      const eased = 1 - Math.pow(1 - k, 3);
      setProgress(from + (1 - from) * eased);
      if (k < 1) auto.current = requestAnimationFrame(step);
      else complete();
    };
    auto.current = requestAnimationFrame(step);
  };

  const onDown = (e: React.PointerEvent) => {
    if (disabled || torn) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, moved: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || torn) return;
    const w = tiltRef.current?.getBoundingClientRect().width ?? 300;
    d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.x, e.clientY - d.y));
    const p = Math.min(1, Math.abs(e.clientX - d.x) / (w * 0.85));
    setProgress((prev) => Math.max(prev, p));
    if (p >= 1) {
      drag.current = null;
      complete();
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || torn) return;
    if (d.moved < 6 || progress > 0.55) autoTear();
  };

  return (
    <div
      ref={tiltRef}
      className={`pack ${god ? 'is-god' : ''} ${torn ? 'is-torn' : ''} ${disabled ? 'is-disabled' : ''}`}
      style={{ '--p': progress, '--glow': glow } as CSSProperties}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className="pack__rot">
        <div className="pack__light" />
        <div className="pack__body">
          <div className="pack__foil" />
          <div className="pack__crest">
            <span>H</span>
          </div>
          <div className="pack__title">HISTORIA</div>
          <div className="pack__series">{god ? 'Édition divine' : 'Série I · Histoire'}</div>
          <div className="pack__count">7 cartes</div>
          <div className="pack__crimp pack__crimp--bottom" />
          <div className="pack__sheen" />
        </div>
        <div className="pack__top">
          <div className="pack__foil" />
          <div className="pack__crimp pack__crimp--top" />
          <div className="pack__sheen" />
        </div>
        <div className="pack__tearline">
          <div className="pack__cut" />
        </div>
      </div>
    </div>
  );
}
