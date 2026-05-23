export const EVENT_CATEGORY = Object.freeze({
  TRACK: "track",
  MONITOR: "monitor",
});

export const EVENT_TYPE = Object.freeze({
  PAGE_VIEW: "page_view",
  JS_ERROR: "js_error",
  RESOURCE_ERROR: "resource_error",
  API_ERROR: "api_error",
  API_SLOW: "api_slow",
  PERFORMANCE: "performance",
  CUSTOM: "custom",
});

export const EVENT_LEVEL = Object.freeze({
  P0: "P0",
  P1: "P1",
  P2: "P2",
});

export const ERROR_KIND = Object.freeze({
  JS: "js",
  PROMISE: "promise",
  VUE: "vue",
  MANUAL: "manual",
});

export const BUILT_IN_EVENT_NAMES = Object.freeze(Object.values(EVENT_TYPE));

export const DEFAULT_EVENT_LEVEL_MAP = Object.freeze({
  [EVENT_TYPE.JS_ERROR]: EVENT_LEVEL.P0,
  [EVENT_TYPE.API_ERROR]: EVENT_LEVEL.P1,
  [EVENT_TYPE.API_SLOW]: EVENT_LEVEL.P1,
  [EVENT_TYPE.PERFORMANCE]: EVENT_LEVEL.P1,
  [EVENT_TYPE.PAGE_VIEW]: EVENT_LEVEL.P2,
  [EVENT_TYPE.RESOURCE_ERROR]: EVENT_LEVEL.P1,
  [EVENT_TYPE.CUSTOM]: EVENT_LEVEL.P2,
});
