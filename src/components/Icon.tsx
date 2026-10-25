const PATHS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 100-18 9 9 0 000 18z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  swap: 'M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  tag: 'M3 12V4h8l10 10-8 8L3 12zM7.5 7.5h.01',
  today: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  history: 'M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8M3 3v5h5M12 7v5l4 2',
  chart: 'M4 20V4M4 20h16M8 16l4-5 3 3 5-7',
  settings:
    'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  back: 'M15 18l-6-6 6-6',
  forward: 'M9 18l6-6-6-6',
  down: 'M6 9l6 6 6-6',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  timer: 'M12 21a8 8 0 100-16 8 8 0 000 16zM12 9v4l2 2M9 2h6',
  up: 'M12 19V5M5 12l7-7 7 7',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4',
  play: 'M8 5l11 7-11 7z',
  pause: 'M9 5v14M15 5v14',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  body: 'M12 6a2 2 0 100-4 2 2 0 000 4zM6 9h12M12 9v13M8.5 22l3.5-8 3.5 8',
  scale: 'M4 7h16l-2 13H6L4 7zM9 7a3 3 0 016 0M12 11l2 3',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
} as const;

export type IconName = keyof typeof PATHS;

/** Arrows that point "back" or "forward" flip in right-to-left languages. */
const MIRRORED = new Set<IconName>(['back', 'forward', 'external']);

export function Icon({
  name,
  size = 22,
  className = '',
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 ${MIRRORED.has(name) ? 'rtl:-scale-x-100' : ''} ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
