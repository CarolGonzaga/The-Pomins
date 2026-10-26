'use client';
import { useEffect, useId, useRef } from 'react';
import type { PointerEvent } from 'react';
import type { FocusStatus } from './model';
import {
  DIAL_MIN,
  DIAL_MAX,
  clampMinutes,
  minutesToAngle,
  angleToMinutes,
  pointerAngle,
  moveAngle,
} from './dial-math';
import './focus-duration-dial.css';

type Gesture = {
  id: number;
  last: number;
  angle: number;
  original: number;
  x: number;
  y: number;
  moved: boolean;
};
export function FocusDurationDial({
  minutes,
  status,
  busy,
  onChange,
  onAction,
}: {
  minutes: number;
  status: FocusStatus;
  busy: boolean;
  onChange: (minutes: number) => void;
  onAction?: () => void | Promise<void>;
}) {
  const help = useId(),
    ring = useRef<HTMLDivElement>(null),
    gesture = useRef<Gesture | null>(null),
    acting = useRef(false),
    centerGesture = useRef<{ id: number; x: number; y: number; cancelled: boolean } | null>(null);
  const locked = status !== 'idle' || busy;
  const action =
    status === 'idle'
      ? 'Iniciar foco'
      : status === 'active'
        ? 'Pausar pelo seletor'
        : status === 'paused' || status === 'interrupted'
          ? 'Retomar pelo seletor'
          : status === 'completed'
            ? 'Foco concluído'
            : status === 'starting'
              ? 'Preparando foco'
              : 'Foco indisponível';
  const caption =
    status === 'idle'
      ? 'Iniciar foco'
      : status === 'active'
        ? 'Pausar'
        : status === 'paused' || status === 'interrupted'
          ? 'Retomar'
          : status === 'completed'
            ? 'Concluído'
            : 'Aguarde';
  useEffect(() => {
    const el = ring.current;
    if (locked) {
      const previous = gesture.current;
      gesture.current = null;
      el?.removeAttribute('data-dragging');
      if (previous && el?.hasPointerCapture(previous.id)) el.releasePointerCapture(previous.id);
    }
    return () => {
      const previous = gesture.current;
      gesture.current = null;
      if (previous && el?.hasPointerCapture(previous.id)) el.releasePointerCapture(previous.id);
    };
  }, [locked]);
  function angle(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return pointerAngle(
      e.clientX,
      e.clientY,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
  }
  function end(e: PointerEvent<HTMLDivElement>, cancel = false) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    e.currentTarget.removeAttribute('data-dragging');
    if (cancel && !locked) onChange(g.original);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  async function act() {
    if (acting.current || busy || !onAction) return;
    acting.current = true;
    try {
      await onAction();
    } finally {
      acting.current = false;
    }
  }
  return (
    <div
      className="focus-duration-dial"
      data-state={status}
      role="group"
      aria-label="Seletor de duração do foco"
    >
      <div className="dial-face">
        <div
          ref={ring}
          className="dial-ring"
          role="slider"
          tabIndex={0}
          aria-label="Duração do foco"
          aria-valuemin={DIAL_MIN}
          aria-valuemax={DIAL_MAX}
          aria-valuenow={minutes}
          aria-valuetext={`${minutes} minutos`}
          aria-disabled={locked}
          aria-describedby={help}
          onKeyDown={(e) => {
            if (locked) return;
            const value =
              e.key === 'Home'
                ? DIAL_MIN
                : e.key === 'End'
                  ? DIAL_MAX
                  : e.key === 'ArrowUp' || e.key === 'ArrowRight'
                    ? minutes + 1
                    : e.key === 'ArrowDown' || e.key === 'ArrowLeft'
                      ? minutes - 1
                      : e.key === 'PageUp'
                        ? minutes + 5
                        : e.key === 'PageDown'
                          ? minutes - 5
                          : null;
            if (value !== null) {
              e.preventDefault();
              onChange(clampMinutes(value));
            }
          }}
          onPointerDown={(e) => {
            if (locked || !e.isPrimary || e.button !== 0 || gesture.current) return;
            // The SVG labels must never start native text/image dragging.
            e.preventDefault();
            e.currentTarget.focus({ preventScroll: true });
            gesture.current = {
              id: e.pointerId,
              last: angle(e),
              angle: minutesToAngle(minutes),
              original: minutes,
              x: e.clientX,
              y: e.clientY,
              moved: false,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const g = gesture.current;
            if (locked || !g || g.id !== e.pointerId) return;
            const next = angle(e);
            if (!g.moved) {
              if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 6) return;
              g.moved = true;
              e.currentTarget.dataset.dragging = 'true';
            }
            g.angle = moveAngle(g.angle, g.last, next);
            g.last = next;
            onChange(angleToMinutes(g.angle));
          }}
          onPointerUp={(e) => end(e)}
          onPointerCancel={(e) => end(e, true)}
          onLostPointerCapture={(e) => {
            // A late loss event from an earlier gesture must not cancel a new capture.
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) end(e, true);
          }}
        >
          <svg viewBox="0 0 160 160" aria-hidden="true">
            <circle cx="80" cy="83" r="57" className="dial-shadow" />
            <circle cx="80" cy="80" r="57" className="dial-rim" />
            {Array.from({ length: 13 }, (_, i) => (
              <path
                key={i}
                d="M80 14v8"
                transform={`rotate(${-135 + i * 22.5} 80 80)`}
                className="dial-tick"
              />
            ))}
            <circle cx="80" cy="80" r="48" className="dial-body" />
            <path
              d="M80 33v12"
              className="dial-needle"
              style={{ transform: `rotate(${minutesToAngle(minutes)}deg)` }}
            />
            <text x="22" y="135">
              2
            </text>
            <text x="80" y="10" textAnchor="middle">
              60
            </text>
            <text x="130" y="135" textAnchor="middle">
              120
            </text>
          </svg>
        </div>
        <button
          type="button"
          className="dial-center"
          aria-label={action}
          disabled={busy || !onAction}
          onPointerDown={(e) => {
            if (!e.isPrimary || e.button !== 0) {
              if (centerGesture.current) centerGesture.current.cancelled = true;
              return;
            }
            centerGesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, cancelled: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const g = centerGesture.current;
            if (g?.id === e.pointerId && Math.hypot(e.clientX - g.x, e.clientY - g.y) >= 6)
              g.cancelled = true;
          }}
          onPointerCancel={() => {
            if (centerGesture.current) centerGesture.current.cancelled = true;
          }}
          onClick={(e) => {
            const cancelled = centerGesture.current?.cancelled;
            centerGesture.current = null;
            // Keyboard/assistive activation has no pointer gesture (detail === 0).
            if (e.detail !== 0 && cancelled) return;
            void act();
          }}
        >
          <strong>
            {minutes}
            <small> min</small>
          </strong>
          <span>{caption}</span>
        </button>
      </div>
      <div className="dial-stepper">
        <button
          type="button"
          aria-label="Diminuir duração em um minuto"
          disabled={locked || minutes <= DIAL_MIN}
          onClick={() => onChange(clampMinutes(minutes - 1))}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Aumentar duração em um minuto"
          disabled={locked || minutes >= DIAL_MAX}
          onClick={() => onChange(clampMinutes(minutes + 1))}
        >
          +
        </button>
      </div>
      <p id={help} className="dial-help">
        Gire a borda ou use as setas do teclado. Home e End vão aos limites; Page Up e Page Down
        ajustam cinco minutos. A duração fica bloqueada durante a sessão.
      </p>
    </div>
  );
}
