import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useI18n } from '../i18n/i18n';
import { Icon } from './Icon';

/** Bottom sheet for secondary content. Closes on backdrop tap, Escape, or the close button. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="animate-sheet pb-safe relative flex max-h-[88dvh] w-full max-w-[480px] flex-col rounded-t-3xl bg-surface outline-none"
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-3">
          <div id={titleId} className="min-w-0 pt-2 text-lg font-bold">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-me-2 flex h-12 w-12 items-center justify-center rounded-full text-muted"
            aria-label={t('common.close')}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {footer && <div className="border-t border-line px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}
