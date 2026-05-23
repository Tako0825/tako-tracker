import { attachGlobalErrorCollector } from "../collectors/error";
import { collectPerformanceMetrics } from "../collectors/performance";
import {
  createTrackedRequestAdapter,
  finishRequestSpan,
  startRequestSpan,
} from "../collectors/request";
import {
  ERROR_KIND,
  EVENT_CATEGORY,
  EVENT_LEVEL,
  EVENT_TYPE,
} from "../constants/events";
import { DEFAULT_OPTIONS } from "../constants/options";
import {
  getDeviceType,
  getLocationHref,
  getOrCreateSessionId,
  getUserAgent,
  isBrowser,
} from "../utils/browser";
import { createEventId, inferLevel } from "../utils/event";

export class Tracker {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.queue = [];
    this.flushTimer = null;
    this.isFlushing = false;
    this.isInitialized = false;
    this.routerAttached = false;
    this.errorAttached = false;
    this.performanceAttached = false;
    this.boundPagehide = this.handlePagehide.bind(this);
    this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
    this.sessionId = getOrCreateSessionId();
  }

  init() {
    if (!isBrowser() || this.isInitialized) {
      return this;
    }

    this.isInitialized = true;

    if (this.options.captureErrors) {
      this.attachGlobalError();
    }

    if (this.options.capturePerformance) {
      this.attachPerformance();
    }

    window.addEventListener("pagehide", this.boundPagehide);
    document.addEventListener(
      "visibilitychange",
      this.boundVisibilityChange,
      false,
    );

    return this;
  }

  destroy() {
    if (!isBrowser()) {
      return;
    }

    clearTimeout(this.flushTimer);
    window.removeEventListener("pagehide", this.boundPagehide);
    document.removeEventListener(
      "visibilitychange",
      this.boundVisibilityChange,
      false,
    );
  }

  attachVueRouter(router) {
    if (!router || this.routerAttached) {
      return this;
    }

    this.routerAttached = true;

    if (router.currentRoute && router.currentRoute.fullPath) {
      this.trackPageView({
        from: "",
        to: router.currentRoute.fullPath,
      });
    }

    router.afterEach((to, from) => {
      this.trackPageView({
        from: from?.fullPath || "",
        to: to?.fullPath || "",
      });
    });

    return this;
  }

  track(input = {}) {
    const event = this.createEvent(input);
    this.queue.push(event);
    this.log("enqueue", event);
    this.scheduleFlush();
    return event;
  }

  trackPageView(payload = {}) {
    return this.track({
      category: EVENT_CATEGORY.TRACK,
      type: EVENT_TYPE.PAGE_VIEW,
      level: EVENT_LEVEL.P2,
      payload,
    });
  }

  trackError(payload = {}, kind = ERROR_KIND.JS) {
    return this.track({
      category: EVENT_CATEGORY.MONITOR,
      type: EVENT_TYPE.JS_ERROR,
      level: EVENT_LEVEL.P0,
      payload: {
        kind,
        ...payload,
      },
    });
  }

  startRequest({ url, method = "GET" }) {
    return startRequestSpan({ url, method });
  }

  endRequest(span, result = {}) {
    finishRequestSpan(this, span, result);
  }

  createRequestAdapter(requestFn) {
    return createTrackedRequestAdapter(this, requestFn);
  }

  async flush({ useBeacon = false } = {}) {
    if (this.isFlushing || !this.queue.length || !this.options.endpoint) {
      return;
    }

    this.isFlushing = true;
    clearTimeout(this.flushTimer);
    const events = this.queue.splice(0, this.options.batchSize);
    const payload = {
      meta: {
        sentAt: Date.now(),
        sdkVersion: this.options.release,
      },
      events,
    };

    try {
      const success = await this.send(payload, useBeacon);

      if (!success) {
        this.queue.unshift(...events);
      }
    } catch (error) {
      this.queue.unshift(...events);
      this.log("flush_error", error);
    } finally {
      this.isFlushing = false;

      if (this.queue.length) {
        this.scheduleFlush();
      }
    }
  }

  createEvent(input = {}) {
    const {
      category = EVENT_CATEGORY.TRACK,
      type = EVENT_TYPE.CUSTOM,
      level = inferLevel(type),
      payload = {},
      ctx = {},
    } = input;

    const currentRoute = this.getRoute();

    return {
      id: createEventId(),
      category,
      type,
      level,
      ts: Date.now(),
      ctx: {
        appId: this.options.appId,
        appName: this.options.appName,
        release: this.options.release,
        env: this.options.env,
        uid: this.getUserId(),
        sid: this.sessionId,
        url: ctx.url || getLocationHref(),
        route: ctx.route || currentRoute,
        ua: ctx.ua || getUserAgent(),
        deviceType: ctx.deviceType || getDeviceType(),
      },
      payload,
    };
  }

  getUserId() {
    if (typeof this.options.getUser !== "function") {
      return undefined;
    }

    const user = this.options.getUser();

    if (!user) {
      return undefined;
    }

    if (typeof user === "object") {
      return user.id;
    }

    return user;
  }

  getRoute() {
    if (typeof this.options.getRoute === "function") {
      return this.options.getRoute();
    }

    if (!isBrowser()) {
      return "";
    }

    return `${window.location.pathname}${window.location.search}`;
  }

  attachGlobalError() {
    if (!isBrowser() || this.errorAttached) {
      return;
    }

    this.errorAttached = true;
    attachGlobalErrorCollector(this);
  }

  attachPerformance() {
    if (!isBrowser() || this.performanceAttached) {
      return;
    }

    this.performanceAttached = true;

    const emit = () => {
      const metrics = collectPerformanceMetrics();

      if (!metrics) {
        return;
      }

      this.track({
        category: EVENT_CATEGORY.MONITOR,
        type: EVENT_TYPE.PERFORMANCE,
        level: EVENT_LEVEL.P1,
        payload: metrics,
      });
    };

    if (document.readyState === "complete") {
      setTimeout(emit, 0);
      return;
    }

    window.addEventListener(
      "load",
      () => {
        setTimeout(emit, 0);
      },
      { once: true },
    );
  }

  scheduleFlush() {
    if (this.queue.length >= this.options.batchSize) {
      this.flush();
      return;
    }

    if (this.flushTimer) {
      return;
    }

    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, this.options.flushInterval);
  }

  async send(payload, useBeacon) {
    const body = JSON.stringify(payload);

    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      return navigator.sendBeacon(this.options.endpoint, blob);
    }

    const response = await fetch(this.options.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    });

    return response.ok;
  }

  handlePagehide() {
    this.flush({ useBeacon: true });
  }

  handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.flush({ useBeacon: true });
    }
  }

  log(type, payload) {
    if (!this.options.debug) {
      return;
    }

    console.log(`[tako-tracker:${type}]`, payload);
  }
}
