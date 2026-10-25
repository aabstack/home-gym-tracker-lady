import {
  formatClock,
  formatDuration,
  formatKg,
  formatLoad,
  formatPrescription,
  formatRir,
  formatSetLine,
  roundKg,
  tempoToWords,
} from './format';

describe('format', () => {
  it('rounds to 0.25 kg', () => {
    expect(roundKg(12.3)).toBe(12.25);
    expect(roundKg(12.4)).toBe(12.5);
    expect(formatKg(10)).toBe('10');
    expect(formatKg(12.5)).toBe('12.5');
  });

  it('formats RIR with 4+', () => {
    expect(formatRir(2)).toBe('2');
    expect(formatRir(4)).toBe('4+');
  });

  it('formats loads', () => {
    expect(formatLoad({ weightKg: 12.5 })).toBe('12.5 kg');
    expect(formatLoad({ weightKg: null })).toBe('BW');
    expect(formatLoad({ weightKg: null, addedKg: 5 })).toBe('BW +5 kg');
    expect(formatLoad({ weightKg: null, bandAssist: true })).toBe('BW (band)');
    expect(formatLoad({ weightKg: null }, 'band')).toBe('Band');
  });

  it('formats the "last time" line', () => {
    expect(
      formatSetLine([
        { setIndex: 1, weightKg: 12.5, reps: 12, rir: 2 },
        { setIndex: 0, weightKg: 12.5, reps: 12, rir: 3 },
        { setIndex: 2, weightKg: 12.5, reps: 11, rir: 2 },
      ]),
    ).toBe('12.5 kg × 12, 12, 11 @ RIR 2');
    expect(
      formatSetLine([
        { setIndex: 0, weightKg: 10, reps: 12, rir: 2 },
        { setIndex: 1, weightKg: 12, reps: 9, rir: 4 },
      ]),
    ).toBe('10 kg × 12, 12 kg × 9 @ RIR 4+');
    expect(formatSetLine([])).toBe('');
  });

  it('explains tempo in words', () => {
    expect(tempoToWords('3-1-1-0')).toBe('3 s down, 1 s pause, 1 s up, 0 s at top');
    expect(tempoToWords('bad')).toBe('bad');
    expect(tempoToWords('3-x-1-0')).toBe('3-x-1-0');
  });

  it('formats prescriptions', () => {
    const it = { sets: 3, repMin: 10, repMax: 12, tempo: '3-1-1-0', restSec: 90 };
    expect(formatPrescription(it, true)).toBe('3 × 10–12 / side · Tempo 3-1-1-0 · Rest 90s');
    expect(formatPrescription({ ...it, repMin: 12, restSec: 0 }, false)).toBe(
      '3 × 12 · Tempo 3-1-1-0 · No rest → next',
    );
  });

  it('formats durations and clocks', () => {
    expect(formatDuration(45 * 60_000)).toBe('45 min');
    expect(formatDuration(75 * 60_000)).toBe('1 h 15 min');
    expect(formatDuration(-5)).toBe('0 min');
    expect(formatClock(72)).toBe('1:12');
    expect(formatClock(4.2)).toBe('0:05');
    expect(formatClock(-3)).toBe('0:00');
  });
});
