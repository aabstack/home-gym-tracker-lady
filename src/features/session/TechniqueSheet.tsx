import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { TECHNIQUES } from '../../data/types';

export function TechniqueSheet({
  open,
  title,
  techniques,
  note,
  perSide,
  onChange,
  onClose,
}: {
  open: boolean;
  title: string;
  techniques: string[];
  note: string;
  perSide: boolean;
  onChange: (patch: { techniques?: string[]; note?: string }) => void;
  onClose: () => void;
}) {
  const toggle = (t: string) =>
    onChange({
      techniques: techniques.includes(t) ? techniques.filter((x) => x !== t) : [...techniques, t],
    });
  const uneven = note.startsWith('Uneven sides');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button variant="primary" block onClick={onClose}>
          Done
        </Button>
      }
    >
      <p className="mb-2 text-label text-muted">Techniques used on this set</p>
      <div className="flex flex-wrap gap-2">
        {TECHNIQUES.map((t) => {
          const on = techniques.includes(t);
          return (
            <button
              key={t}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(t)}
              className={`min-h-12 rounded-full px-4 font-medium ${on ? 'bg-accent text-on-accent' : 'bg-raised text-text'}`}
            >
              {t}
            </button>
          );
        })}
      </div>
      {perSide && (
        <div className="mt-4">
          <button
            type="button"
            role="checkbox"
            aria-checked={uneven}
            onClick={() => onChange({ note: uneven ? '' : 'Uneven sides' })}
            className={`min-h-12 rounded-full px-4 font-medium ${uneven ? 'bg-warn text-bg' : 'bg-raised text-text'}`}
          >
            Uneven sides
          </button>
        </div>
      )}
      <label className="mt-4 block">
        <span className="text-label text-muted">Set note (optional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder={perSide ? 'e.g. left side 2 reps short' : 'e.g. grip slipped'}
          className="mt-1 h-12 w-full rounded-xl bg-raised px-3 outline-none"
        />
      </label>
    </Sheet>
  );
}
