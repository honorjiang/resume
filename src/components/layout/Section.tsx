import type { PropsWithChildren } from 'react';
import { motion } from 'framer-motion';
import { Container } from './Container';

type SectionProps = PropsWithChildren<{
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  contentClassName?: string;
}>;

export function Section({
  id,
  eyebrow,
  title,
  description,
  className,
  contentClassName,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className={[
        'scroll-mt-24 border-t border-[var(--line)] py-14 sm:py-18',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="max-w-3xl"
        >
          {eyebrow ? (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
              {description}
            </p>
          ) : null}
        </motion.div>

        <div className={['mt-8 sm:mt-10', contentClassName].filter(Boolean).join(' ')}>
          {children}
        </div>
      </Container>
    </section>
  );
}
