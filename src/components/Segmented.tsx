export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className = '',
  size = 'md',
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex rounded-xl bg-raised p-0.5 ${className}`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`num min-w-0 flex-1 rounded-[10px] font-semibold ${size === 'sm' ? 'min-h-10 text-label' : 'min-h-11'} ${active ? 'bg-text text-bg' : 'text-muted'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
