import { isBrowser } from "../utils/browser";

export function collectPerformanceMetrics() {
  if (!isBrowser() || !window.performance) {
    return null;
  }

  const navigation =
    performance.getEntriesByType("navigation")[0] || performance.timing;
  const paints = performance.getEntriesByType("paint") || [];
  const fp = paints.find((item) => item.name === "first-paint");
  const fcp = paints.find((item) => item.name === "first-contentful-paint");

  if (!navigation) {
    return null;
  }

  const navigationStart = navigation.startTime || navigation.navigationStart || 0;
  const responseStart = navigation.responseStart || 0;
  const requestStart = navigation.requestStart || 0;
  const domContentLoadedEventEnd = navigation.domContentLoadedEventEnd || 0;
  const loadEventEnd = navigation.loadEventEnd || 0;

  return {
    fp: roundMetric(fp?.startTime),
    fcp: roundMetric(fcp?.startTime),
    ttfb: roundMetric(responseStart - requestStart),
    domReady: roundMetric(domContentLoadedEventEnd - navigationStart),
    load: roundMetric(loadEventEnd - navigationStart),
  };
}

function roundMetric(value) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return 0;
  }

  return Math.round(value);
}
