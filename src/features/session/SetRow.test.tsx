import { fireEvent, render, screen } from '@testing-library/react';
import { programSeed } from '../../data/seed';
import type { Exercise, SetLog } from '../../data/types';
import { I18nContext, makeI18n } from '../../i18n/i18n';
import { SetRow, type RowValues } from './SetRow';

const ex = (id: string) => programSeed.exercises.find((e) => e.id === id) as Exercise;
const WEIGHTS = [2, 4, 6, 8, 10, 12];
const values: RowValues = {
  weightKg: 10,
  addedKg: 0,
  bandAssist: false,
  reps: 12,
  rir: 2,
  techniques: [],
  note: '',
};

function setup(props: Partial<Parameters<typeof SetRow>[0]> = {}) {
  const handlers = {
    onChange: vi.fn(),
    onTick: vi.fn(),
    onEdit: vi.fn(),
    onCancelEdit: vi.fn(),
    onOpenOptions: vi.fn(),
  };
  render(
    <SetRow
      label="1"
      exercise={ex('incline_db_press')}
      values={values}
      editing={false}
      current
      weights={WEIGHTS}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('SetRow (one line: set · weight · reps · ✓)', () => {
  it('logs a set with one tap when prefilled values are right', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Complete set 1' }));
    expect(h.onTick).toHaveBeenCalledTimes(1);
  });

  it('shows only weight and reps on the row; effort lives behind the set number', () => {
    const h = setup();
    expect(screen.queryByRole('radio')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Set 1 options/ }));
    expect(h.onOpenOptions).toHaveBeenCalledTimes(1);
  });

  it('weight stepper snaps to available dumbbells', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Increase Set 1 weight in kg' }));
    expect(h.onChange).toHaveBeenLastCalledWith({ weightKg: 12 });
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Set 1 weight in kg' }));
    expect(h.onChange).toHaveBeenLastCalledWith({ weightKg: 8 });
  });

  it('accepts a typed weight as fallback, rounded to 0.25 kg (Arabic decimal comma too)', () => {
    const h = setup();
    const input = screen.getByRole('textbox', { name: 'Set 1 weight in kg' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '11,3' } });
    fireEvent.blur(input);
    expect(h.onChange).toHaveBeenLastCalledWith({ weightKg: 11.25 });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '7٫5' } });
    fireEvent.blur(input);
    expect(h.onChange).toHaveBeenLastCalledWith({ weightKg: 7.5 });
  });

  it('ignores invalid typed input', () => {
    const h = setup();
    const input = screen.getByRole('textbox', { name: 'Set 1 reps' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(h.onChange).not.toHaveBeenCalled();
  });

  it('reps ±1', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Set 1 reps' }));
    expect(h.onChange).toHaveBeenLastCalledWith({ reps: 11 });
  });

  it('bodyweight exercises show "—" for no added weight', () => {
    const h = setup({ exercise: ex('incline_push_up'), values: { ...values, weightKg: null } });
    expect(screen.getByRole('textbox', { name: 'Set 1 load' })).toHaveValue('—');
    fireEvent.click(screen.getByRole('button', { name: 'Increase Set 1 load' }));
    expect(h.onChange).toHaveBeenLastCalledWith({ addedKg: 2.5, bandAssist: false });
  });

  it('assisted exercises can step down to band assist', () => {
    // Her program has no assisted exercise; use one with the assisted load type.
    const assisted: Exercise = { ...ex('incline_push_up'), loadType: 'assisted' };
    const h = setup({ exercise: assisted, values: { ...values, weightKg: null } });
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Set 1 load' }));
    expect(h.onChange).toHaveBeenLastCalledWith({ addedKg: 0, bandAssist: true });
  });

  it('band exercises show a fixed Band label', () => {
    setup({ exercise: ex('band_face_pull'), values: { ...values, weightKg: null } });
    expect(screen.getByText('Band')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /weight/ })).toBeNull();
  });

  it('a logged set is one compact line; tapping it edits', () => {
    const log: SetLog = {
      id: 'x',
      sessionId: 's',
      exerciseId: 'incline_db_press',
      setIndex: 0,
      weightKg: 12.5,
      reps: 11,
      rir: 1,
      techniques: ['pause'],
      completedAt: 1,
    };
    const h = setup({ logged: log });
    const row = screen.getByRole('button', { name: /Set 1 logged: 12.5 kg × 11/ });
    expect(row).toHaveTextContent('12.5 kg × 11');
    fireEvent.click(row);
    expect(h.onEdit).toHaveBeenCalledTimes(1);
  });

  it('editing shows a cancel button', () => {
    const h = setup({ editing: true });
    fireEvent.click(screen.getByRole('button', { name: /Cancel edit/ }));
    expect(h.onCancelEdit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Save set 1' })).toBeInTheDocument();
  });

  it('renders in Arabic', () => {
    render(
      <I18nContext.Provider value={makeI18n('ar')}>
        <SetRow
          label="1"
          exercise={ex('incline_push_up')}
          values={{ ...values, weightKg: null }}
          editing={false}
          current
          weights={WEIGHTS}
          onChange={vi.fn()}
          onTick={vi.fn()}
          onEdit={vi.fn()}
          onCancelEdit={vi.fn()}
          onOpenOptions={vi.fn()}
        />
      </I18nContext.Provider>,
    );
    expect(screen.getByRole('button', { name: 'إنهاء الجولة 1' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'تكرارات الجولة 1' })).toBeInTheDocument();
  });
});
