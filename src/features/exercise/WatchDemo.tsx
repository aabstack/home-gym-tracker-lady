import { Icon } from '../../components/Icon';
import { demoSearchUrl } from './demos';

/** Note under the drawing plus a button that opens a YouTube search (needs internet). */
export function WatchDemo({ name, suffix }: { name: string; suffix?: string }) {
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  return (
    <div className="rounded-2xl border border-line p-3">
      <p className="text-label text-muted">
        The drawing shows the basic movement and the tempo. For proper form and technique, watch a
        video demo before your first set.
      </p>
      {online ? (
        <a
          href={demoSearchUrl(name, suffix)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-raised px-4 font-semibold"
        >
          <Icon name="play" size={18} className="text-danger" /> Watch demo
          <Icon name="external" size={16} className="text-muted" />
        </a>
      ) : (
        <p className="mt-2 flex min-h-12 items-center justify-center rounded-2xl bg-raised px-4 text-label text-muted">
          You're offline. Connect to the internet to watch a demo.
        </p>
      )}
      <p className="mt-1 text-center text-[12px] text-muted">Opens YouTube · needs internet</p>
    </div>
  );
}
