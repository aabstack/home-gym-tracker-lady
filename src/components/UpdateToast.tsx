import { useEffect, useState } from 'react';
import { isUpdateReady, UPDATE_EVENT } from '../pwa/register';

export function UpdateToast() {
  const [ready, setReady] = useState(isUpdateReady);
  useEffect(() => {
    const on = () => setReady(true);
    window.addEventListener(UPDATE_EVENT, on);
    return () => window.removeEventListener(UPDATE_EVENT, on);
  }, []);
  if (!ready) return null;
  return (
    <div className="pt-safe fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
      <div
        role="status"
        className="mt-2 flex w-full max-w-[456px] items-center justify-between gap-3 rounded-2xl bg-raised px-4 py-1 shadow-lg"
      >
        <span>Update available</span>
        <div className="flex">
          <button
            type="button"
            className="min-h-12 px-3 text-muted"
            onClick={() => setReady(false)}
          >
            Later
          </button>
          <button
            type="button"
            className="min-h-12 px-3 font-bold text-accent"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
