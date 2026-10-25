import type { ReactNode } from 'react';

export function PageHeader({
  title,
  right,
  sub,
}: {
  title: string;
  right?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-2 px-4 pb-3 pt-5">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold">{title}</h1>
        {sub && <div className="text-label text-muted">{sub}</div>}
      </div>
      {right}
    </header>
  );
}
