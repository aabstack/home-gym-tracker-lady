import { Icon } from '../../components/Icon';
import { demoSearchUrl } from './demos';
import { useI18n } from '../../i18n/i18n';

/** Note under the drawing plus a button that opens a YouTube search (needs internet). */
export function WatchDemo({ name, suffix }: { name: string; suffix?: string }) {
  const { t } = useI18n();
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  return (
    <div className="rounded-2xl border border-line p-3">
      <p className="text-label text-muted">{t('watch.note')}</p>
      {online ? (
        <a
          href={demoSearchUrl(name, suffix)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-raised px-4 font-semibold"
        >
          <Icon name="play" size={18} className="text-danger" /> {t('watch.button')}
          <Icon name="external" size={16} className="text-muted" />
        </a>
      ) : (
        <p className="mt-2 flex min-h-12 items-center justify-center rounded-2xl bg-raised px-4 text-label text-muted">
          {t('watch.offline')}
        </p>
      )}
      <p className="mt-1 text-center text-[12px] text-muted">{t('watch.footer')}</p>
    </div>
  );
}
