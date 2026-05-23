import { DEFAULT_EVENT_LEVEL_MAP, EVENT_LEVEL } from "../constants/events";

export function createEventId() {
  return `evt_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export function inferLevel(type) {
  return DEFAULT_EVENT_LEVEL_MAP[type] || EVENT_LEVEL.P2;
}

export function resolveMethod(input, init = {}) {
  if (init?.method) {
    return init.method;
  }

  if (input instanceof Request) {
    return input.method;
  }

  return "GET";
}

export function resolveUrl(input) {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof Request) {
    return input.url;
  }

  return "";
}
