import { getNow } from "../utils/browser";
import { resolveMethod, resolveUrl } from "../utils/event";
import { EVENT_CATEGORY, EVENT_LEVEL, EVENT_TYPE } from "../constants/events";

export function startRequestSpan({ url, method = "GET" }) {
  return {
    url,
    method: String(method || "GET").toUpperCase(),
    startTime: getNow(),
  };
}

export function finishRequestSpan(tracker, span, result = {}) {
  if (!span || shouldIgnoreRequest(tracker, span.url)) {
    return;
  }

  const duration = Math.round(getNow() - span.startTime);
  const { status = 0, ok = true, error } = result;

  if (!ok || error || status >= 400) {
    tracker.track({
      category: EVENT_CATEGORY.MONITOR,
      type: EVENT_TYPE.API_ERROR,
      level: EVENT_LEVEL.P1,
      payload: {
        method: span.method,
        url: span.url,
        status,
        duration,
        errMsg: error?.message || result.errMsg || "request_failed",
      },
    });
    return;
  }

  if (duration >= tracker.options.slowApiThreshold) {
    tracker.track({
      category: EVENT_CATEGORY.MONITOR,
      type: EVENT_TYPE.API_SLOW,
      level: EVENT_LEVEL.P1,
      payload: {
        method: span.method,
        url: span.url,
        status,
        duration,
      },
    });
  }
}

export function createTrackedRequestAdapter(tracker, requestFn) {
  return async (input, init = {}) => {
    const method = resolveMethod(input, init);
    const url = resolveUrl(input);
    const span = startRequestSpan({ url, method });

    try {
      const response = await requestFn(input, init);
      finishRequestSpan(tracker, span, {
        status: response?.status || 0,
        ok: response?.ok,
      });
      return response;
    } catch (error) {
      finishRequestSpan(tracker, span, {
        status: 0,
        ok: false,
        error,
      });
      throw error;
    }
  };
}

function shouldIgnoreRequest(tracker, url = "") {
  return (
    Boolean(tracker.options.endpoint) &&
    String(url).includes(tracker.options.endpoint)
  );
}
