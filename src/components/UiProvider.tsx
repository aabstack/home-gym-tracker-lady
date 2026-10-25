import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { UiContext, type ConfirmOptions, type SnackbarOptions } from './ui-context';
import { Button } from './Button';
import { useI18n } from '../i18n/i18n';

export function UiProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<(SnackbarOptions & { id: number }) | null>(null);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(
    null,
  );
  const counter = useRef(0);
  const { t } = useI18n();

  const snackbar = useCallback((o: SnackbarOptions) => {
    setSnack({ ...o, id: ++counter.current });
  }, []);

  const confirm = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })),
    [],
  );

  useEffect(() => {
    if (!snack) return;
    const t = window.setTimeout(() => setSnack(null), snack.durationMs ?? 5000);
    return () => window.clearTimeout(t);
  }, [snack]);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <UiContext.Provider value={{ snackbar, confirm }}>
      {children}
      {snack && (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-3">
          <div
            role="status"
            className="pointer-events-auto flex w-full max-w-[456px] items-center justify-between gap-3 rounded-2xl bg-text px-4 py-2 text-bg shadow-lg"
          >
            <span className="py-2">{snack.message}</span>
            {snack.actionLabel && (
              <button
                type="button"
                className="min-h-12 shrink-0 px-2 font-bold uppercase tracking-wide"
                style={{ color: 'var(--bg)' }}
                onClick={() => {
                  snack.onAction?.();
                  setSnack(null);
                }}
              >
                {snack.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="pb-safe w-full max-w-[456px] rounded-3xl bg-surface p-5"
          >
            <h2 id="confirm-title" className="text-lg font-bold">
              {dialog.title}
            </h2>
            {dialog.message && <p className="mt-2 text-muted">{dialog.message}</p>}
            <div className="mt-5 flex flex-col gap-2">
              <Button
                block
                variant={dialog.danger ? 'danger' : 'primary'}
                onClick={() => close(true)}
                autoFocus
              >
                {dialog.confirmLabel ?? t('common.ok')}
              </Button>
              <Button block variant="secondary" onClick={() => close(false)}>
                {dialog.cancelLabel ?? t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </UiContext.Provider>
  );
}
