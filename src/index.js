import { Tracker } from "./core/Tracker";
export * from "./constants/events";
export * from "./constants/options";
import { isBrowser } from "./utils/browser";

export function createTracker(options = {}) {
  return new Tracker(options);
}

if (isBrowser()) {
  window.TakoTracker = {
    createTracker,
  };
}
