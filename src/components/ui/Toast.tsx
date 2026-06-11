import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLanguageMode } from '../../hooks/useLanguageMode';

type ToastTone = 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  duration?: number;
};

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 3000,
  error: 6000,
  warning: 4500,
  info: 4500,
};

const MAX_VISIBLE = 5;

// ---- Context ----

type ToastContextValue = {
  show: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }

  return useMemo(
    () => ({
      ...ctx,
      success: (title: string, description?: string) =>
        ctx.show({ tone: 'success', title, description }),
      error: (title: string, description?: string) =>
        ctx.show({ tone: 'error', title, description }),
      warning: (title: string, description?: string) =>
        ctx.show({ tone: 'warning', title, description }),
      info: (title: string, description?: string) =>
        ctx.show({ tone: 'info', title, description }),
    }),
    [ctx],
  );
}

// ---- Provider ----

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    window.clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<Toast, 'id'>): string => {
      const id = `toast-${++toastCounter}`;
      const duration = toast.duration ?? DEFAULT_DURATION[toast.tone];

      window.clearTimeout(timersRef.current.get(id));
      timersRef.current.set(
        id,
        window.setTimeout(() => dismiss(id), duration),
      );

      setToasts((current) => {
        const next = [...current, { ...toast, id }];
        // 只保留最新的 MAX_VISIBLE 个
        if (next.length > MAX_VISIBLE) {
          const removed = next.slice(0, next.length - MAX_VISIBLE);
          removed.forEach((t) => {
            window.clearTimeout(timersRef.current.get(t.id));
            timersRef.current.delete(t.id);
          });
          return next.slice(-MAX_VISIBLE);
        }
        return next;
      });

      return id;
    },
    [dismiss],
  );

  // 清理定时器
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ---- Render ----

const toneStyles: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
};

const toneIconColor: Record<ToastTone, string> = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  warning: 'text-amber-500',
  info: 'text-sky-500',
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  const { t } = useLanguageMode();
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2 print:hidden" style={{ maxWidth: 420 }}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={[
              'flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm',
              toneStyles[toast.tone],
            ].join(' ')}
          >
            <span className={['mt-0.5 text-base leading-none', toneIconColor[toast.tone]].join(' ')}>
              {toast.tone === 'success' ? '✓' : toast.tone === 'error' ? '✕' : toast.tone === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-xs leading-5 opacity-80">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 rounded-full p-1 opacity-60 transition hover:opacity-100"
              aria-label={t('common.close')}
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
