import {
  ERROR_KIND,
  EVENT_CATEGORY,
  EVENT_LEVEL,
  EVENT_TYPE,
} from "../constants/events";

export function attachGlobalErrorCollector(tracker) {
  window.addEventListener("error", (event) => {
    if (event?.error) {
      tracker.trackError({
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
      return;
    }

    const target = event?.target;
    if (target?.src || target?.href) {
      tracker.track({
        category: EVENT_CATEGORY.MONITOR,
        type: EVENT_TYPE.RESOURCE_ERROR,
        level: EVENT_LEVEL.P1,
        payload: {
          tagName: target.tagName,
          url: target.src || target.href,
        },
      });
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    tracker.trackError(
      {
        message:
          reason?.message || String(reason || "Unhandled promise rejection"),
        stack: reason?.stack,
      },
      ERROR_KIND.PROMISE,
    );
  });
}
