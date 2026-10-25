export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block">{label}</span>
        {description && <span className="block text-label text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-accent ${checked ? 'bg-accent' : 'bg-raised'}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-text transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`}
          style={checked ? { background: 'var(--on-accent)' } : undefined}
        />
      </span>
    </label>
  );
}
