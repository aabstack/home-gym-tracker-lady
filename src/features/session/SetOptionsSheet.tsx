import { Button } from '../../components/Button';
import { Segmented } from '../../components/Segmented';
import { Sheet } from '../../components/Sheet';
import { TECHNIQUES, type Rir } from '../../data/types';
import { formatRir } from '../../domain/format';
import { useI18n } from '../../i18n/i18n';

const RIR_OPTIONS = [0, 1, 2, 3, 4].map((v) => ({ value: v as Rir, label: formatRir(v) }));
/** Stored in the note (in English) when she marks a per-side set as uneven. */
const UNEVEN = 'Uneven sides';

/** The optional details of one set: effort, techniques and a note. */
export function SetOptionsSheet({
  open,
  title,
  rir,
  techniques,
  note,
  perSide,
  onChange,
  onClose,
}: {
  open: boolean;
  title: string;
  rir: Rir;
  techniques: string[];
  note: string;
  perSide: boolean;
  onChange: (patch: { rir?: Rir; techniques?: string[]; note?: string }) => void;
  onClose: () => void;
}) {
  const { t, technique } = useI18n();
  const toggle = (tag: string) =>
    onChange({
      techniques: techniques.includes(tag)
        ? techniques.filter((x) => x !== tag)
        : [...techniques, tag],
    });
  const uneven = note.startsWith(UNEVEN);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button variant="primary" block onClick={onClose}>
          {t('common.done')}
        </Button>
      }
    >
      <h3 className="font-semibold">{t('opts.effort')}</h3>
      <p className="mb-2 text-label text-muted">{t('opts.effortHint')}</p>
      <div dir="ltr">
        <Segmented
          label={t('opts.effort')}
          options={RIR_OPTIONS}
          value={rir}
          onChange={(v) => onChange({ rir: v })}
        />
      </div>

      <p className="mb-2 mt-5 text-label text-muted">{t('opts.techniques')}</p>
      <div className="flex flex-wrap gap-2">
        {TECHNIQUES.map((tag) => {
          const on = techniques.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(tag)}
              className={`min-h-12 rounded-full px-4 font-medium ${on ? 'bg-accent text-on-accent' : 'bg-raised text-text'}`}
            >
              {technique(tag)}
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
            onClick={() => onChange({ note: uneven ? '' : UNEVEN })}
            className={`min-h-12 rounded-full px-4 font-medium ${uneven ? 'bg-warn text-bg' : 'bg-raised text-text'}`}
          >
            {t('opts.uneven')}
          </button>
        </div>
      )}
      <label className="mt-4 block">
        <span className="text-label text-muted">{t('opts.note')}</span>
        <input
          type="text"
          value={note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder={t(perSide ? 'opts.notePhSide' : 'opts.notePh')}
          className="mt-1 h-12 w-full rounded-xl bg-raised px-3 outline-none"
        />
      </label>
    </Sheet>
  );
}
