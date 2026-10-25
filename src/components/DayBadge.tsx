import type { DayId } from '../data/types';
import { DAY_BG } from './dayColors';

export function DayBadge({ day, size = 'md' }: { day: DayId; size?: 'sm' | 'md' | 'lg' }) {
  const dims =
    size === 'lg' ? 'h-12 w-12 text-2xl' : size === 'sm' ? 'h-7 w-7 text-sm' : 'h-9 w-9 text-lg';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-bold text-bg ${DAY_BG[day]} ${dims}`}
      aria-label={`Day ${day}`}
    >
      {day}
    </span>
  );
}
