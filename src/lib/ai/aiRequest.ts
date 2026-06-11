/**
 * AI 请求统一基础设施
 *
 * 为所有 AI 接口请求提供：
 * - AbortController 取消支持
 * - 超时自动取消（默认 30s）
 * - 区分用户取消 / 超时 / 网络错误的错误类型
 *
 * 用法：
 *   const handle = createAiRequest((signal) => fetch(url, { signal }), { timeoutMs: 30000 });
 *   handle.abort(); // 手动取消
 *   const result = await handle.promise;
 */

/** 用户手动取消请求时抛出 */
export class AiRequestAbortError extends Error {
  constructor(message = '请求已取消') {
    super(message);
    this.name = 'AiRequestAbortError';
  }
}

/** 请求超时时抛出 */
export class AiRequestTimeoutError extends Error {
  constructor(message = '请求超时，请检查网络或稍后重试') {
    super(message);
    this.name = 'AiRequestTimeoutError';
  }
}

/** 创建 AI 请求时的可选项 */
export type AiRequestOptions = {
  /** 超时时间（毫秒），默认 30000 */
  timeoutMs?: number;
  /** 外部传入的 AbortSignal，触发时也会中断本次请求 */
  externalSignal?: AbortSignal;
};

/** 请求句柄，promise 用来 await 结果，abort 用来手动取消 */
export type AiRequestHandle<T> = {
  promise: Promise<T>;
  abort: () => void;
};

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * 包装一个接受 AbortSignal 的 fetcher，返回带超时和取消能力的请求句柄。
 *
 * 行为：
 * - timeoutMs 时间内未完成 → 抛 AiRequestTimeoutError
 * - 手动调用 abort()       → 抛 AiRequestAbortError
 * - externalSignal 触发    → 抛 AiRequestAbortError
 * - fetcher 自身抛错        → 透传原始错误
 */
export function createAiRequest<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: AiRequestOptions = {},
): AiRequestHandle<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, externalSignal } = options;
  const controller = new AbortController();

  let manuallyAborted = false;
  let timedOut = false;

  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      });
    }
  }

  const abort = () => {
    if (controller.signal.aborted) {
      return;
    }
    manuallyAborted = true;
    controller.abort();
  };

  const promise = (async () => {
    try {
      return await fetcher(controller.signal);
    } catch (error) {
      if (controller.signal.aborted) {
        if (timedOut) {
          throw new AiRequestTimeoutError();
        }
        if (manuallyAborted || externalSignal?.aborted) {
          throw new AiRequestAbortError();
        }
        // fetcher 内部主动 abort 但不是上面任何一种情况，也视为取消
        throw new AiRequestAbortError();
      }
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  })();

  return { promise, abort };
}

/** 判断一个错误是否是用户取消（用于决定要不要弹 toast） */
export function isAbortError(error: unknown): error is AiRequestAbortError {
  return error instanceof AiRequestAbortError;
}

/** 判断是否是请求超时 */
export function isTimeoutError(error: unknown): error is AiRequestTimeoutError {
  return error instanceof AiRequestTimeoutError;
}
