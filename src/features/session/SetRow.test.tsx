import { act, fireEvent, render, screen } from '@testing-library/react';
import { programSeed } from '../../data/seed';
import type { Exercise, SetLog } from '../../data/types';
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
    onOpenTechniques: vi.fn(),
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

describe('SetRow', () => {
  it('logs a set with one tap when prefilled values are right', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Complete set 1' }));
    expect(h.onTick).toHaveBeenCalledTimes(1);
  });

  it('weight stepper snaps to available dumbbells', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Increase Set 1 weight in kg' }));
    expect(h.onChange).toHaveBeenLastCalledWith({ weightKg: 12 });
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Set 1 weight in kg' }));
    expect(h.onChange).toHaveBeenLastCalledWith({ weightKg: 8 });
  });

  it('accepts a typed weight as fallback, rounded to 0.25 kg', () => {
    const h = setup();
    const input = screen.getByRole('textbox', { name: 'Set 1 weight in kg' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '11,3' } });
    fireEvent.blur(input);
    expect(h.onChange).toHaveBeenLastCalledWith({ weightKg: 11.25 });
  });

  it('ignores invalid typed input', () => {
    const h = setup();
    const input = screen.getByRole('textbox', { name: 'Set 1 reps' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(h.onChange).not.toHaveBeenCalled();
  });

  it('reps ±1 and RIR selection', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Set 1 reps' }));
    expect(h.onChange).toHaveBeenLastCalledWith({ reps: 11 });
    fireEvent.click(screen.getByRole('radio', { name: '4+' }));
    expect(h.onChange).toHaveBeenLastCalledWith({ rir: 4 });
  });

  it('assisted exercises step Band ↔ BW ↔ +kg', () => {
    // Her program has no assisted exercise; use one with the assisted load type.
    const assisted: Exercise = { ...ex('incline_push_up'), loadType: 'assisted' };
    const h = setup({ exercise: assisted, values: { ...values, weightKg: null } });
    expect(screen.getByRole('textbox', { name: 'Set 1 load' })).toHaveValue('BW');
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Set 1 load' }));
    expect(h.onChange).toHaveBeenLastCalledWith({ addedKg: 0, bandAssist: true });
    fireEvent.click(screen.getByRole('button', { name: 'Increase Set 1 load' }));
    expect(h.onChange).toHaveBeenLastCalledWith({ addedKg: 2.5, bandAssist: false });
  });

  it('band exercises show a fixed Band label', () => {
    setup({ exercise: ex('band_face_pull'), values: { ...values, weightKg: null } });
    expect(screen.getByText('Band')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /weight/ })).toBeNull();
  });

  it('completed sets are compact and long-press opens edit', () => {
    vi.useFakeTimers();
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
    const row = screen.getByRole('button', { name: /Set 1 logged: 12.5 kg × 11, RIR 1/ });
    expect(row).toHaveTextContent('pause');
    fireEvent.pointerDown(row);
    act(() => vi.advanceTimersByTime(300));
    fireEvent.pointerUp(row);
    act(() => vi.advanceTimersByTime(500));
    expect(h.onEdit).not.toHaveBeenCalled(); // short tap does nothing
    fireEvent.pointerDown(row);
    act(() => vi.advanceTimersByTime(500));
    expect(h.onEdit).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
