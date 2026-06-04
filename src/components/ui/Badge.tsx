import type { PropsWithChildren } from 'react';

type BadgeProps = PropsWithChildren<{
  tone?: 'default' | 'accent' | 'inverse';
}>;

export function Badge({ children, tone = 'default' }: BadgeProps) {
  const toneClass =
    tone === 'accent'
      ? 'border-[var(--accent-soft)] bg-[color:rgba(29,78,216,0.08)] text-[var(--accent)]'
      : tone === 'inverse'
        ? 'border-white/10 bg-white/10 text-white'
        : 'border-slate-200 bg-white text-slate-700';

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium tracking-[0.02em]',
        toneClass,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
