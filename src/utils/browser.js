export function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getLocationHref() {
  return isBrowser() ? window.location.href : "";
}

export function getUserAgent() {
  return isBrowser() ? window.navigator.userAgent : "";
}

export function getDeviceType() {
  if (!isBrowser()) {
    return "unknown";
  }

  return /Mobi|Android|iPhone/i.test(window.navigator.userAgent)
    ? "mobile"
    : "desktop";
}

export function getNow() {
  return isBrowser() && window.performance ? window.performance.now() : Date.now();
}

export function getOrCreateSessionId() {
  if (!isBrowser()) {
    return `sid_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }

  const cacheKey = "__TAKO_TRACKER_SID__";
  const cached = window.sessionStorage.getItem(cacheKey);

  if (cached) {
    return cached;
  }

  const sid = `sid_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  window.sessionStorage.setItem(cacheKey, sid);
  return sid;
}
