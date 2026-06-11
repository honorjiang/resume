import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

type SectionNavItem = {
  id: string;
  label: string;
};

type SectionNavProps = {
  items: readonly SectionNavItem[];
  activeId: string;
};

export function SectionNav({ items, activeId }: SectionNavProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <nav
      className="no-print print:hidden fixed bottom-8 right-6 top-24 z-30 hidden xl:flex xl:items-center"
      aria-label="Section navigation"
    >
      <div className="rounded-full border border-white/28 bg-white/18 px-2.5 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.035)] backdrop-blur-sm">
        <ul className="flex flex-col items-center gap-3" role="list">
          {items.map((item) => {
            const isActive = item.id === activeId;

            return (
              <li
                key={item.id}
                className="group relative flex flex-col items-center last:before:hidden before:absolute before:left-1/2 before:top-full before:h-3 before:w-px before:-translate-x-1/2 before:bg-slate-200/55"
              >
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(item.id)
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  aria-label={item.label}
                  aria-current={isActive ? 'true' : undefined}
                  className={[
                    'rounded-full transition-all duration-300',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
                    isActive
                      ? 'size-3 bg-[var(--accent)] shadow-[0_0_0_4px_var(--accent-soft)]'
                      : 'size-2.5 bg-slate-300/75 hover:bg-slate-400 dark:bg-[var(--nav-inactive)] dark:hover:bg-[var(--nav-inactive-hover)]',
                  ].join(' ')}
                />

                <AnimatePresence>
                  {hoveredId === item.id && (
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white shadow-lg after:absolute after:left-full after:top-1/2 after:-translate-y-1/2 after:border-4 after:border-transparent after:border-l-slate-950"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
