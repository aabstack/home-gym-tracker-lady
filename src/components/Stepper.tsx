import { useRef, useState } from 'react';
import { Icon } from './Icon';

/**
 * Large − value + control. Tapping the value opens the numeric keypad as a fallback.
 * `step` returns the next value for a direction; `parse` turns typed text into a value
 * (return undefined to reject the input).
 */
export function Stepper<T>({
  value,
  display,
  step,
  onChange,
  parse,
  label,
  editText,
  className = '',
  disabled,
}: {
  value: T;
  display: string;
  step: (dir: 1 | -1, current: T) => T;
  onChange: (v: T) => void;
  parse?: (text: string) => T | undefined;
  /** Text placed in the input when editing starts. */
  editText?: string;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const cancelled = useRef(false);

  const commit = () => {
    if (!cancelled.current && editing !== null && parse) {
      const v = parse(editing);
      if (v !== undefined) onChange(v);
    }
    cancelled.current = false;
    setEditing(null);
  };

  const btn =
    'flex h-12 w-11 shrink-0 items-center justify-center rounded-xl bg-raised text-text active:opacity-60 disabled:opacity-30';

  return (
    <div
      className={`flex min-w-0 items-center gap-0.5 ${className}`}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={btn}
        aria-label={`Decrease ${label}`}
        disabled={disabled}
        onClick={() => onChange(step(-1, value))}
      >
        <Icon name="minus" size={20} />
      </button>
      {parse ? (
        <input
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          aria-label={label}
          disabled={disabled}
          className="num h-12 w-full min-w-0 flex-1 rounded-lg bg-transparent text-center text-input font-semibold outline-none focus:bg-raised"
          value={editing ?? display}
          onFocus={(e) => {
            setEditing(editText ?? '');
            requestAnimationFrame(() => e.target.select());
          }}
          onChange={(e) => setEditing(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              cancelled.current = true;
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      ) : (
        <span className="num flex h-12 min-w-0 flex-1 items-center justify-center text-input font-semibold">
          {display}
        </span>
      )}
      <button
        type="button"
        className={btn}
        aria-label={`Increase ${label}`}
        disabled={disabled}
        onClick={() => onChange(step(1, value))}
      >
        <Icon name="plus" size={20} />
      </button>
    </div>
  );
}
